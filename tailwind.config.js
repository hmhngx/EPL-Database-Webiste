/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#38003C',
          dark: '#1a001c',
        },
        accent: '#00FF85',
        secondary: '#04f5ff',
        raspberry: '#D8195B',
        background: {
          DEFAULT: '#F3F4F6',
          dark: '#171717',
        },
      },
      fontFamily: {
        heading: ['Chakra Petch', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
        mono: ['Chakra Petch', 'monospace'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to bottom, #38003C, #000000)',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(0, 255, 133, 0.3)',
        'glow-md': '0 0 20px rgba(0, 255, 133, 0.5)',
        'glow-lg': '0 0 30px rgba(0, 255, 133, 0.7)',
        'glow-xl': '0 0 40px rgba(0, 255, 133, 0.9)',
      },
      transitionProperty: {
        'all': 'all',
      },
      transitionDuration: {
        '300': '300ms',
      },
      transitionTimingFunction: {
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.hover\\:glow-sm:hover': {
          boxShadow: '0 0 10px rgba(0, 255, 133, 0.3)',
        },
        '.hover\\:glow-md:hover': {
          boxShadow: '0 0 20px rgba(0, 255, 133, 0.5)',
        },
        '.hover\\:glow-lg:hover': {
          boxShadow: '0 0 30px rgba(0, 255, 133, 0.7)',
        },
        '.hover\\:glow-xl:hover': {
          boxShadow: '0 0 40px rgba(0, 255, 133, 0.9)',
        },
      });
    },
  ],
}
