/*
 * Shared smoke-test helper: render an Astro calculator component to HTML via the
 * Container API and mount it into happy-dom's document.body. Client <script>
 * tags are stripped first — happy-dom would otherwise try (and fail) to load the
 * hoisted module; the test drives the controller directly instead.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

export async function mountComponent(Component, props = {}) {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Component, { props });
  document.body.innerHTML = html.replace(/<script[\s\S]*?<\/script>/gi, '');
}
