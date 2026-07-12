/** @type {import('tailwindcss').Config} */
export default {
  // Class-based dark mode, mirroring the original per-page `tailwind.config` blocks.
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx,vue,svelte}'],
  theme: {
    extend: {
      // Union of every legacy page palette (index, brisket, stall, fuel, privacy)
      // so each migrated page renders with its original color scheme.
      colors: {
        base: {
          DEFAULT: '#121824',
          900: '#0d121b',
          850: '#121824',
          800: '#1a2233',
          700: '#26314a',
          600: '#354262',
          500: '#4a5878',
          400: '#7c8aab',
          300: '#aeb8d0',
        },
        flame: { 600: '#ea580c', 500: '#f97316', 400: '#fb923c' },
        amber: { 500: '#f59e0b', 400: '#fbbf24', 300: '#fcd34d' },
        smoke: {
          900: '#0c0a09',
          850: '#131110',
          800: '#1c1917',
          700: '#292524',
          600: '#44403c',
          500: '#57534e',
          400: '#78716c',
          300: '#a8a29e',
        },
        ember: { 600: '#c2410c', 500: '#ea580c', 400: '#f97316', 300: '#fb923c' },
        coal: '#0a0a0a',
        slate: {
          950: '#020617',
          925: '#0a1120',
          900: '#0f172a',
          850: '#141f38',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
        },
        charcoal: {
          950: '#0b0b0c',
          900: '#111113',
          850: '#17181a',
          800: '#1d1e21',
          700: '#2a2c30',
          600: '#3a3d42',
          500: '#52565c',
          400: '#7a7f87',
          300: '#adb2ba',
        },
        emerald: { 600: '#059669', 500: '#10b981', 400: '#34d399', 300: '#6ee7b7' },
      },
      fontFamily: {
        display: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  // Classes below are applied only at runtime by the calculator scripts
  // (segmented-control painters, holding/serving advisories, verdict states),
  // so they must survive JIT purging even if a literal isn't scanned.
  safelist: [
    'bg-ember-500', 'bg-flame-500', 'text-white',
    'text-smoke-400', 'hover:text-smoke-300',
    'text-slate-400', 'hover:text-slate-300',
    'text-charcoal-400', 'hover:text-charcoal-300', 'text-charcoal-950',
    'font-semibold', 'shadow',
    'bg-ember-500/10', 'ring-ember-500/40', 'ring-ember-500/50', 'text-ember-200', 'text-ember-400', 'text-ember-300/80',
    'bg-smoke-800/60', 'ring-smoke-700', 'text-smoke-300',
    'bg-emerald-500/10', 'ring-emerald-500/40', 'text-emerald-400', 'text-emerald-300/70',
    'bg-emerald-500', 'bg-charcoal-700',
  ],
};
