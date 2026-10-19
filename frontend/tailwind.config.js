/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--bg-input)',
        ring: 'var(--primary)',
        background: 'var(--bg-app)',
        foreground: 'var(--text)',
        primary: { DEFAULT: 'var(--primary-solid)', foreground: 'var(--on-primary)' },
        secondary: { DEFAULT: 'var(--bg-surface-hover)', foreground: 'var(--text)' },
        destructive: { DEFAULT: 'var(--danger)', foreground: 'var(--on-primary)' },
        muted: { DEFAULT: 'var(--bg-surface-hover)', foreground: 'var(--text-muted)' },
        accent: { DEFAULT: 'var(--bg-surface-hover)', foreground: 'var(--text)' },
        popover: { DEFAULT: 'var(--bg-surface)', foreground: 'var(--text)' },
        card: { DEFAULT: 'var(--bg-surface)', foreground: 'var(--text)' },
        white: 'rgb(var(--text-rgb) / <alpha-value>)',
        slate: {
          50: 'rgb(var(--text-rgb) / <alpha-value>)',
          100: 'rgb(var(--text-rgb) / <alpha-value>)',
          200: 'rgb(var(--text-rgb) / <alpha-value>)',
          300: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
          400: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
          500: 'rgb(var(--text-faint-rgb) / <alpha-value>)',
          600: 'rgb(var(--border-strong-rgb) / <alpha-value>)',
          700: 'rgb(var(--bg-surface-hover-rgb) / <alpha-value>)',
          800: 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
          900: 'rgb(var(--bg-app-rgb) / <alpha-value>)',
          950: 'rgb(var(--bg-canvas-rgb) / <alpha-value>)',
        },
        blue: {
          300: 'rgb(var(--primary-rgb) / <alpha-value>)',
          400: 'rgb(var(--primary-rgb) / <alpha-value>)',
          500: 'rgb(var(--primary-rgb) / <alpha-value>)',
          600: 'rgb(var(--primary-solid-rgb) / <alpha-value>)',
          700: 'rgb(var(--primary-solid-rgb) / <alpha-value>)',
          800: 'rgb(var(--primary-solid-rgb) / <alpha-value>)',
        },
        sky: {
          300: 'rgb(var(--primary-rgb) / <alpha-value>)',
          400: 'rgb(var(--primary-rgb) / <alpha-value>)',
          500: 'rgb(var(--primary-rgb) / <alpha-value>)',
          600: 'rgb(var(--primary-solid-rgb) / <alpha-value>)',
          700: 'rgb(var(--primary-solid-rgb) / <alpha-value>)',
        },
        zinc: {
          700: 'rgb(var(--border-strong-rgb) / <alpha-value>)',
          800: 'rgb(var(--border-rgb) / <alpha-value>)',
          900: 'rgb(var(--bg-app-rgb) / <alpha-value>)',
        },
        emerald: {
          300: 'rgb(var(--success-rgb) / <alpha-value>)',
          400: 'rgb(var(--success-rgb) / <alpha-value>)',
          500: 'rgb(var(--success-rgb) / <alpha-value>)',
        },
        green: {
          300: 'rgb(var(--success-rgb) / <alpha-value>)',
          400: 'rgb(var(--success-rgb) / <alpha-value>)',
          500: 'rgb(var(--success-rgb) / <alpha-value>)',
        },
        amber: {
          300: 'rgb(var(--warning-rgb) / <alpha-value>)',
          400: 'rgb(var(--warning-rgb) / <alpha-value>)',
          500: 'rgb(var(--warning-rgb) / <alpha-value>)',
        },
        yellow: {
          300: 'rgb(var(--warning-rgb) / <alpha-value>)',
          400: 'rgb(var(--warning-rgb) / <alpha-value>)',
          500: 'rgb(var(--warning-rgb) / <alpha-value>)',
        },
        red: {
          300: 'rgb(var(--danger-rgb) / <alpha-value>)',
          400: 'rgb(var(--danger-rgb) / <alpha-value>)',
          500: 'rgb(var(--danger-rgb) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
