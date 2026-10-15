import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Moonlight base
        night: {
          950: '#06080f',
          900: '#0b1120',
          800: '#111a2e',
          700: '#1b2740',
          600: '#273554',
        },
        parchment: {
          100: '#f6ecd3',
          200: '#e9d9ad',
          300: '#d9bf7f',
        },
        gold: {
          400: '#f3c969',
          500: '#d4a63a',
          600: '#a97e24',
        },
        blood: {
          500: '#c03838',
          600: '#9e2a2a',
          700: '#73181a',
        },
        moonlight: '#bcd4ff',
      },
      fontFamily: {
        serif: ['"Cinzel"', 'ui-serif', 'Georgia', 'serif'],
        display: ['"Cormorant Garamond"', '"Cinzel"', 'ui-serif', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'moonlight-vignette':
          'radial-gradient(ellipse at 50% -10%, rgba(188,212,255,0.18) 0%, rgba(188,212,255,0) 55%), radial-gradient(ellipse at 50% 120%, rgba(192,56,56,0.10) 0%, rgba(0,0,0,0) 65%)',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        slowfloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s ease-in-out infinite',
        flicker: 'flicker 2.3s ease-in-out infinite',
        slowfloat: 'slowfloat 6s ease-in-out infinite',
      },
      boxShadow: {
        glow: '0 0 24px rgba(188,212,255,0.25)',
        bloodglow: '0 0 24px rgba(192,56,56,0.45)',
        goldglow: '0 0 32px rgba(243,201,105,0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config;
