import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/providers/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#04090F',
        deep: '#080F1C',
        'surface-1': '#0D1829',
        'surface-2': '#121F34',
        'surface-3': '#1A2B47',
        border: '#1E2D47',
        'border-glow': '#2A4070',
        'gold-300': '#FBE499',
        'gold-400': '#F8D668',
        'gold-500': '#F5C842',
        'gold-glow': 'rgba(245, 200, 66, 0.15)',
        'signal-up': '#10B981',
        'signal-glow': 'rgba(16, 185, 129, 0.12)',
        'signal-down': '#EF4444',
        'signal-warn': '#F59E0B',
        'text-primary': '#E8EDF5',
        'text-secondary': '#8BA0BF',
        'text-tertiary': '#4A6080',
        'text-ghost': '#2A3D57',
        'data-400': '#60A5FA',
        'data-500': '#3B82F6',
        'data-glow': 'rgba(59, 130, 246, 0.10)',
      },
      fontFamily: {
        urbanist: ['var(--font-urbanist)', 'sans-serif'],
        'space-grotesk': ['var(--font-space-grotesk)', 'sans-serif'],
        syne: ['var(--font-syne)', 'sans-serif'],
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        shimmer: 'shimmer 1.5s infinite',
        ping: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        ping: {
          '75%, 100%': {
            transform: 'scale(2)',
            opacity: '0',
          },
        },
      },
    },
  },
  plugins: [],
}
export default config
