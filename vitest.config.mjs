import { getViteConfig } from 'astro/config';

// getViteConfig wires Astro's Vite plugins into Vitest so component smoke tests
// can import and render `.astro` files via the Astro Container API. Pure-JS
// golden tests default to the node environment; the DOM smoke tests opt into
// happy-dom per-file with a `// @vitest-environment happy-dom` directive.
export default getViteConfig({
  test: {
    environment: 'node',
  },
});
