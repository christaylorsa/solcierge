import type { Config } from 'tailwindcss'

/**
 * Every colour, radius and easing here resolves to a CSS custom property
 * declared once in src/app/globals.css. Re-theming the whole product is a
 * change to that token block, never a sweep through components.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // rgb(var(--token) / <alpha-value>) is what makes the opacity modifiers work:
        // `bg-bg/85`, `border-accent/40`, `via-bg/90`. A plain var(--token) cannot take
        // an alpha and Tailwind emits transparent white instead, silently.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        // Already a resolved colour with its own alpha, so no modifier support.
        line: 'var(--line)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'var(--radius-sm)',
        lg: 'var(--radius-lg)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-text)',
      },
      transitionTimingFunction: {
        ease: 'var(--ease)',
      },
      maxWidth: {
        shell: '1180px',
        prose: '68ch',
      },
      letterSpacing: {
        label: '0.18em',
      },
    },
  },
  plugins: [],
}

export default config
