/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#38003C',      // EPL Purple
        accent: '#00FF85',       // EPL Green
        secondary: '#04f5ff',    // EPL Blue
        background: '#F3F4F6',   // Light Gray
      },
      fontFamily: {
        heading: ['Chakra Petch', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
