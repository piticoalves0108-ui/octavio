import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // permite um build paralelo ao `next dev` (ex.: NEXT_DIST_DIR=.next-build npx next build)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    formats: ["image/avif", "image/webp"],
    // fotos da galeria puxadas da Instagram API
    remotePatterns: [
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
  },
  experimental: {
    optimizePackageImports: ["@react-three/drei", "@react-three/postprocessing", "motion"],
  },
};

export default nextConfig;
