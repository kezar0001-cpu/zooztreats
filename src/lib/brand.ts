// Zooz Treats brand constants. Logo-inspired palette — keep in sync with the
// Tailwind theme (tailwind.config.ts). Use these when a raw colour value is
// needed (e.g. inline SVG, email-style markup); prefer Tailwind classes in JSX.

export const BRAND_COLORS = {
  blushPink: "#F8E0E0",
  softCream: "#FFF8F5",
  chocolate: "#75401B",
  deepCocoa: "#532911",
  cookieCaramel: "#D68D6F",
  warmGrey: "#B9AEA0",
} as const;

export const BRAND_NAME = "Zooz Treats";

// Public path to the logo. Drop your real logo at `public/zooz-logo.jpeg` and
// change this to "/zooz-logo.jpeg" (the SVG below is a brand-styled placeholder
// so the app looks correct until then).
export const LOGO_SRC = "/zooz-logo.svg";
export const LOGO_ALT = "Zooz Treats logo";
