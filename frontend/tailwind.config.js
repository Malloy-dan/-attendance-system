/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        blush: {
          50: "#FFF6FA",
          100: "#FFE9F2",
          200: "#FBD3E5",
        },
        rose: {
          400: "#EC6A9C",
          500: "#D6336C",
          600: "#B72A5B",
          700: "#8F1F47",
        },
        plum: {
          900: "#2B1620",
          600: "#5C3A48",
          400: "#8A6373",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Manrope'", "sans-serif"],
      },
      boxShadow: {
        ticket: "0 10px 30px -10px rgba(183, 42, 91, 0.35)",
      },
    },
  },
  plugins: [],
}
