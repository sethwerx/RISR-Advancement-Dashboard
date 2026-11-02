import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        navy: {
          950: "#091525",
          900: "#0e2744",
          800: "#1a3d66",
          700: "#245084",
        },
        paper: "#f4f7fa",
        ink: "#142033",
      },
    },
  },
  plugins: [],
};

export default config;
