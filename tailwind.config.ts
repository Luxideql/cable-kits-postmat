import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5' },
        // ── Semantic CSS-var tokens (auto-switch with .dark class) ──────────
        c1:   'var(--c1)',   // primary text   (white / near-black)
        c2:   'var(--c2)',   // secondary text
        c3:   'var(--c3)',   // muted text
        c4:   'var(--c4)',   // dim text
        cbg:  'var(--cbg)',  // page background
        csr:  'var(--csr)',  // card / surface
        csr2: 'var(--csr2)', // elevated surface
        cbrd: 'var(--cbrd)', // border color (hex, no opacity)
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      animation: {
        'fade-up':  'fade-up 0.35s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':  'fade-in 0.25s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16,1,0.3,1)',
        'shimmer':  'shimmer 2s infinite linear',
      },
      keyframes: {
        'fade-up':  { '0%': { opacity:'0', transform:'translateY(10px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        'fade-in':  { '0%': { opacity:'0' }, '100%': { opacity:'1' } },
        'scale-in': { '0%': { opacity:'0', transform:'scale(0.96)' }, '100%': { opacity:'1', transform:'scale(1)' } },
        'shimmer':  { '0%': { backgroundPosition:'-400px 0' }, '100%': { backgroundPosition:'calc(400px + 100%) 0' } },
      },
      boxShadow: {
        'glow':    '0 0 24px rgba(99,102,241,0.18)',
        'card':    '0 1px 3px rgba(0,0,0,0.12)',
        'card-lg': '0 4px 24px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
export default config;
