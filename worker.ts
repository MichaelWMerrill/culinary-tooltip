/*
 * Cloudflare Worker entry (Workers static-assets model).
 *
 * Static assets in dist/ are served automatically by the assets binding; this
 * Worker only runs for requests that don't match a static file. It handles the
 * dynamic contact endpoint and otherwise defers to the static assets (including
 * the 404 page via `not_found_handling`).
 */
import { handleContact, type ContactEnv } from './server/contactHandler';

interface Env extends ContactEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method === 'POST') return handleContact(request, env);
      return new Response(JSON.stringify({ ok: false, error: 'Use POST.' }), {
        status: 405,
        headers: { 'content-type': 'application/json; charset=utf-8', allow: 'POST' },
      });
    }

    // Everything else is a static asset (or the 404 page).
    return env.ASSETS.fetch(request);
  },
};
