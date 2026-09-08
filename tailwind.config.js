/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F8F6',
        surface: '#FFFFFF',
        'surface-subtle': '#F2F4F0',
        'text-main': '#202522',
        'text-muted': '#69716C',
        'border-color': '#E6E9E5',
        brand: {
          50: '#F4F9F6',
          100: '#EAF5EE',
          200: '#D5EBDD',
          500: '#3F8F68',
          600: '#347655',
          700: '#2A6044',
        },
        state: {
          success: '#4F9D69',
          warning: '#C58A35',
          error: '#C85C5C',
        }
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
