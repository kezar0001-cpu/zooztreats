/** @type {import('next').NextConfig} */
const supabaseHostname = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig = {
  images: {
    remotePatterns: [
      // Allow Supabase Storage public image URLs.
      ...(supabaseHostname
        ? [{ protocol: "https", hostname: supabaseHostname }]
        : []),
      // Fallback wildcard for any *.supabase.co project storage URL.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
