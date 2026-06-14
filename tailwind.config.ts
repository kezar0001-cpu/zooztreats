import type { Config } from "tailwindcss";

// ---------------------------------------------------------------------------
// Zooz Treats brand palette (logo-inspired)
//   Blush pink     #F8E0E0   soft feminine background
//   Soft cream     #FFF8F5   warm light background
//   Chocolate brown#75401B   primary brand / buttons
//   Deep cocoa     #532911   headings / deepest text
//   Cookie caramel #D68D6F   secondary accents
//   Muted warm grey#B9AEA0   subtle borders / muted text
// The existing brand/cream/blush scales are remapped to these so the palette
// flows through every component. See also BRAND_COLORS in src/lib/brand.ts.
// ---------------------------------------------------------------------------
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Chocolate → deep cocoa. Primary brand tone (buttons, headings, text).
        brand: {
          50: "#f8efe9",
          100: "#efdacb",
          200: "#e2bfa9", // warm beige — borders
          300: "#d29e7f",
          400: "#c07d57",
          500: "#9d5e35",
          600: "#75401b", // chocolate brown — primary button
          700: "#633519",
          800: "#532911", // deep cocoa
          900: "#3f1f0c",
        },
        // Soft cream backgrounds.
        cream: {
          50: "#fff8f5", // soft cream
          100: "#fdeee7",
          200: "#f8ddd1",
          300: "#efc9ba", // warm beige — soft border
        },
        // Blush pink accents / backgrounds.
        blush: {
          50: "#f8e0e0", // blush pink
          100: "#f3d2d2",
          200: "#ecbcbc",
          300: "#e0a0a0",
          400: "#cf8080",
          500: "#b86464",
        },
        // Cookie caramel — secondary accent.
        caramel: {
          50: "#fbeee7",
          100: "#f5ddcf",
          200: "#eec3ac",
          300: "#e3a888",
          400: "#d68d6f", // cookie caramel
          500: "#c2785a",
          600: "#a86246",
        },
        // Muted warm grey — subtle borders / muted text.
        warmgrey: {
          DEFAULT: "#b9aea0",
          light: "#d7cfc4",
          dark: "#8f8474",
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
        soft: "0 10px 30px -12px rgba(83, 41, 17, 0.18)",
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
