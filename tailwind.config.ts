import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Calibri", "Carlito", "sans-serif"],
        title: ["Bebas Neue", "sans-serif"],
        heading: ["Oswald", "sans-serif"],
      },
      colors: {
        navy: {
          950: "#18243f",
          900: "#23355D",
          800: "#2e4678",
          700: "#3d5a8a",
        },
        paper: "#f4f7fa",
        ink: "#142033",
      },
    },
  },
  plugins: [],
};

export default config;
