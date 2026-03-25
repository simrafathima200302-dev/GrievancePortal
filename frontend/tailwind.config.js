/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0a1628', 2: '#112240', 3: '#1a3356' },
        gold: { DEFAULT: '#c9a84c', 2: '#e8c86a', 3: '#f5e0a0' },
        cream: { DEFAULT: '#f8f5ee', 2: '#ede8dc' },
      },
      fontFamily: {
        serif: ["'Playfair Display'", 'serif'],
        sans: ["'DM Sans'", 'sans-serif'],
      },
    },
  },
  plugins: [],
};
