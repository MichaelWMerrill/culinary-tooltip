/*
 * Cloudflare Pages Function: POST /api/contact
 *
 * Accepts a JSON contact-form submission, validates it, verifies a Cloudflare
 * Turnstile token server-side, and forwards the message to contact@empiricalbbq.com
 * via Resend (if RESEND_API_KEY is set) or MailChannels.
 *
 * Required env:
 *   TURNSTILE_SECRET_KEY  — Cloudflare Turnstile secret (server-side verification)
 * Optional env:
 *   RESEND_API_KEY        — if present, send via Resend instead of MailChannels
 *
 * NOTE: This is the Pages Functions convention (a `functions/` directory). If the
 * project is deployed as a Workers static-assets app instead of Pages, this route
 * must be wired as a Worker fetch handler — see README "Contact endpoint".
 */

interface Env {
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
}

const CONTACT_TO = 'contact@empiricalbbq.com';
const CONTACT_FROM = 'Empirical BBQ <contact@empiricalbbq.com>';
const ALLOWED_HOSTS = ['empiricalbbq.com', 'www.empiricalbbq.com'];
const MAX_MESSAGE = 5000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  // Missing Origin (some same-origin GETs) is not expected for our POST; reject.
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const requestHost = new URL(request.url).host;
  // Allow the deployed domain, its www variant, and whatever host served this
  // function (covers *.pages.dev / *.workers.dev preview URLs and localhost).
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

function buildEmail(fields: Record<string, string>) {
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
  ].filter((l) => l !== false && l !== undefined);
  return { subject, text: lines.join('\n') };
}

async function sendViaResend(apiKey: string, subject: string, text: string, replyTo?: string): Promise<Response> {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: CONTACT_FROM,
      to: [CONTACT_TO],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
}

async function sendViaMailChannels(subject: string, text: string, replyTo?: string): Promise<Response> {
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

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context;

  if (!isSameOrigin(request)) {
    return json({ ok: false, error: 'Forbidden origin.' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const topic = String(body.topic ?? '').trim();
  const calc = String(body.calc ?? '').trim();
  const message = String(body.message ?? '').trim();
  const token = String(body.turnstileToken ?? body['cf-turnstile-response'] ?? '').trim();

  if (!message) {
    return json({ ok: false, error: 'Message is required.' }, 400);
  }
  if (message.length > MAX_MESSAGE) {
    return json({ ok: false, error: `Message must be under ${MAX_MESSAGE} characters.` }, 400);
  }

  // Turnstile verification (server-side).
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
  const replyTo = email && email.includes('@') ? email : undefined;

  try {
    const sendRes = env.RESEND_API_KEY
      ? await sendViaResend(env.RESEND_API_KEY, subject, text, replyTo)
      : await sendViaMailChannels(subject, text, replyTo);

    if (!sendRes.ok) {
      const detail = await sendRes.text().catch(() => '');
      return json({ ok: false, error: 'Delivery failed. Please email us directly.', detail: detail.slice(0, 300) }, 502);
    }
  } catch {
    return json({ ok: false, error: 'Delivery failed. Please email us directly.' }, 502);
  }

  return json({ ok: true });
};

// A GET to the endpoint is not supported; guide callers to POST.
export const onRequestGet = (): Response => json({ ok: false, error: 'Use POST.' }, 405);
