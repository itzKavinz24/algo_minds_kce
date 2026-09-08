/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F4F7F5',
        surface: '#FFFFFF',
        'surface-subtle': '#EEF3F0',
        'text-main': '#18221E',
        'text-muted': '#66736C',
        'border-color': '#DDE6E1',
        primary: {
          DEFAULT: '#176B52',
          hover: '#125641',
          soft: '#E3F2EC',
          softHover: '#D4EBE1',
        },
        accent: '#2FA87A',
        brand: {
          50: '#F4F9F6',
          100: '#E3F2EC',
          200: '#D4EBE1',
          500: '#176B52',
          600: '#125641',
          700: '#0E4333',
        },
        state: {
          success: '#3E9B68',
          warning: '#D69A3A',
          error: '#D76565',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
      }
    },
  },
  plugins: [],
}
