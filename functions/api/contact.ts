/*
 * Cloudflare Pages Function: POST /api/contact
 *
 * Thin adapter over the shared handler in server/contactHandler.ts. This exists
 * for the Cloudflare Pages deployment model (a `functions/` directory). The
 * Workers deployment model uses worker.ts instead — both call handleContact.
 * See README "Contact endpoint".
 */
import { handleContact, type ContactEnv } from '../../server/contactHandler';

export const onRequestPost = (context: { request: Request; env: ContactEnv }): Promise<Response> =>
  handleContact(context.request, context.env);

export const onRequestGet = (): Response =>
  new Response(JSON.stringify({ ok: false, error: 'Use POST.' }), {
    status: 405,
    headers: { 'content-type': 'application/json; charset=utf-8', allow: 'POST' },
  });
