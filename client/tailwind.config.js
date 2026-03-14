/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#fbeaf0',   // was '#eef2ff'
          100: '#f4c0d1',   // was '#e0e7ff'
          500: '#d4537e',   // was '#6366f1'
          600: '#c04070',   // was '#4f46e5'
          700: '#993556',   // was '#4338ca'
          900: '#4b1528',   // was '#1e1b4b'
        },
      },
    },
  },
  plugins: [],
};
