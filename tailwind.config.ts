import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Warm brown — primary brand / cookie tone.
        brand: {
          50: "#fdf6f0",
          100: "#f9e8db",
          200: "#f1cbb0",
          300: "#e7a982",
          400: "#db8455",
          500: "#cf6634",
          600: "#b34f29",
          700: "#8f3d23",
          800: "#733323",
          900: "#5e2c20",
        },
        // Soft cream backgrounds.
        cream: {
          50: "#fefcf8",
          100: "#fdf8f1",
          200: "#f9efe1",
          300: "#f3e3cd",
        },
        // Light pink / blush accents.
        blush: {
          50: "#fdf4f1",
          100: "#fbe8e2",
          200: "#f6d2c8",
          300: "#efb3a4",
          400: "#e58f7b",
          500: "#d76f57",
        },
      },
      fontFamily: {
        serif: [
          "Georgia",
          "Cambria",
          '"Times New Roman"',
          "Times",
          "serif",
        ],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(120, 70, 40, 0.18)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
