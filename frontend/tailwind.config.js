/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        nx: {
          bg: '#0a1628',
          elevated: '#0d1f3a',
          card: '#122b4d',
          sidebar: '#081224',
          border: 'rgba(125, 211, 252, 0.1)',
          'border-hover': 'rgba(125, 211, 252, 0.2)',
          text: '#f0f9ff',
          muted: '#93c5fd',
          dim: '#60a5fa',
          blue: '#38bdf8',
          'dark-blue': '#0284c7',
          cyan: '#7dd3fc',
        },
      },
      animation: {
        'skeleton-shimmer': 'skeletonShimmer 1.4s ease-in-out infinite',
      },
      keyframes: {
        skeletonShimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
};
