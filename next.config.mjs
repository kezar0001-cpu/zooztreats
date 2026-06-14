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

// Supabase Storage public objects are served from:
//   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
const storagePathname = "/storage/v1/object/public/**";

const nextConfig = {
  images: {
    remotePatterns: [
      // Allow this project's Supabase Storage public image URLs.
      ...(supabaseHostname
        ? [
            {
              protocol: "https",
              hostname: supabaseHostname,
              pathname: storagePathname,
            },
          ]
        : []),
      // Fallback for any *.supabase.co project storage URL.
      { protocol: "https", hostname: "*.supabase.co", pathname: storagePathname },
    ],
  },
  experimental: {
    serverActions: {
      // Product photo uploads go through a Server Action. The default body
      // limit is 1 MB, which crashes on normal-sized photos — raise it.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
