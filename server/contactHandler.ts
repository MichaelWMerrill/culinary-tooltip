/*
 * Contact-form handler. `worker.ts` (the Workers static-assets deploy) routes
 * POST /api/contact here. The handler is deployment-agnostic — if the project
 * ever moves to Cloudflare Pages, a thin `functions/api/contact.ts` adapter
 * (`onRequestPost = (ctx) => handleContact(ctx.request, ctx.env)`) can wrap it
 * without changes here.
 *
 * Validates the submission, verifies a Cloudflare Turnstile token server-side,
 * and forwards the message to contact@empiricalbbq.com via Resend (if
 * RESEND_API_KEY is set) or MailChannels.
 *
 * Required env: TURNSTILE_SECRET_KEY
 * Optional env: RESEND_API_KEY
 */

export interface ContactEnv {
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
}

const CONTACT_TO = 'contact@empiricalbbq.com';
const CONTACT_FROM = 'Empirical BBQ <contact@empiricalbbq.com>';
const ALLOWED_HOSTS = ['empiricalbbq.com', 'www.empiricalbbq.com'];
const MAX_MESSAGE = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Single-line field for headers/subject: strip ALL control chars, cap length. */
const cleanLine = (s: unknown, max: number): string =>
  String(s ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, max);

/** Multi-line body: keep tab/newline, strip other control chars (incl. NUL). */
const cleanBody = (s: unknown): string =>
  String(s ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
  });

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return false; // our POST always carries an Origin
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const requestHost = new URL(request.url).host;
  // Allow the deployed domain, its www variant, and whatever host served this
  // request (covers *.workers.dev / *.pages.dev preview URLs and localhost).
  return ALLOWED_HOSTS.includes(host) || host === requestHost;
}

async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<boolean> {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

function buildEmail(fields: Record<string, string>): { subject: string; text: string } {
  const { name, email, topic, calc, message } = fields;
  const subject = `[Empirical BBQ] ${topic || 'Contact'}` + (calc && calc !== 'General / all' ? ` — ${calc}` : '');
  const lines = [
    name && `Name: ${name}`,
    email && `Reply to: ${email}`,
    topic && `Topic: ${topic}`,
    calc && `Calculator: ${calc}`,
    '',
    message,
    '',
    '— Sent from the Empirical BBQ contact form',
  ].filter((l) => l !== false && l !== undefined && l !== '');
  return { subject, text: lines.join('\n') };
}

function sendViaResend(apiKey: string, subject: string, text: string, replyTo?: string): Promise<Response> {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: CONTACT_FROM,
      to: [CONTACT_TO],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
}

function sendViaMailChannels(subject: string, text: string, replyTo?: string): Promise<Response> {
  return fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: CONTACT_TO, name: 'Empirical BBQ' }] }],
      from: { email: 'contact@empiricalbbq.com', name: 'Empirical BBQ' },
      subject,
      content: [{ type: 'text/plain', value: text }],
      ...(replyTo ? { reply_to: { email: replyTo } } : {}),
    }),
  });
}

export async function handleContact(request: Request, env: ContactEnv): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json({ ok: false, error: 'Forbidden origin.' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  // Single-line fields feed the subject/headers → strip control chars + cap.
  const name = cleanLine(body.name, 200);
  const email = cleanLine(body.email, 254);
  const topic = cleanLine(body.topic, 100);
  const calc = cleanLine(body.calc, 100);
  const message = cleanBody(body.message);
  const token = String(body.turnstileToken ?? body['cf-turnstile-response'] ?? '').trim();

  if (!message) return json({ ok: false, error: 'Message is required.' }, 400);
  if (message.length > MAX_MESSAGE) {
    return json({ ok: false, error: `Message must be under ${MAX_MESSAGE} characters.` }, 400);
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    return json({ ok: false, error: 'Server is missing TURNSTILE_SECRET_KEY.' }, 500);
  }
  if (!token) {
    return json({ ok: false, error: 'Missing verification token. Please complete the challenge.' }, 400);
  }
  const ip = request.headers.get('CF-Connecting-IP');
  const human = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip);
  if (!human) {
    return json({ ok: false, error: 'Verification failed. Please try again.' }, 400);
  }

  const { subject, text } = buildEmail({ name, email, topic, calc, message });
  const replyTo = EMAIL_RE.test(email) ? email : undefined;

  try {
    const sendRes = env.RESEND_API_KEY
      ? await sendViaResend(env.RESEND_API_KEY, subject, text, replyTo)
      : await sendViaMailChannels(subject, text, replyTo);
    if (!sendRes.ok) {
      // Keep the upstream provider's error out of the client response (it can
      // expose provider internals); surface it server-side only, via
      // observability logs, for debugging.
      const detail = await sendRes.text().catch(() => '');
      console.error('contact delivery failed', sendRes.status, detail.slice(0, 300));
      return json({ ok: false, error: 'Delivery failed. Please email us directly.' }, 502);
    }
  } catch {
    return json({ ok: false, error: 'Delivery failed. Please email us directly.' }, 502);
  }

  return json({ ok: true });
}
