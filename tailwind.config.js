/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-deep': 'rgb(var(--primary-deep) / <alpha-value>)',
        'primary-soft': 'rgb(var(--primary-soft) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        'danger-soft': 'rgb(var(--danger-soft) / <alpha-value>)',
        sidebar: 'rgb(var(--sidebar) / <alpha-value>)',
        'sidebar-ink': 'rgb(var(--sidebar-ink) / <alpha-value>)',
        'sidebar-muted': 'rgb(var(--sidebar-muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Noto Sans Bengali"', 'system-ui', 'sans-serif'],
        display: ['"Noto Serif Bengali"', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(20 35 28 / 0.04), 0 8px 24px -16px rgb(20 35 28 / 0.16)',
        lift: '0 18px 50px -22px rgb(13 59 48 / 0.38)',
      },
      borderRadius: {
        xl2: '1.15rem',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(22px) scale(.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.45' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        'fade-in': 'fade-in .2s ease-out both',
        'slide-up': 'slide-up .28s cubic-bezier(.2,.8,.2,1) both',
        'soft-pulse': 'soft-pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
