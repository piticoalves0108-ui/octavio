import type { NextConfig } from "next";

/**
 * Edição HTML (npm run html): export estático. O prefixo provisório "/__porango__"
 * é trocado por caminhos relativos pelo scripts/edicao-html.mjs.
 */
const edicaoHtml = process.env.NEXT_PUBLIC_EDICAO_HTML === "1";

const nextConfig: NextConfig = {
  ...(edicaoHtml ? { output: "export" as const, assetPrefix: "/__porango__" } : {}),
  reactStrictMode: true,
  // permite um build paralelo ao `next dev` (ex.: NEXT_DIST_DIR=.next-build npx next build)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    unoptimized: edicaoHtml,
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
