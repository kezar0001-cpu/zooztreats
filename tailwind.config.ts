import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Soft, warm bakery-inspired palette (used lightly in admin).
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
      },
    },
  },
  plugins: [],
};

export default config;
