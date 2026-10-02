import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Sem o indicador do Next no canto da tela (atrapalha as capturas da cena 3D).
  devIndicators: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    // Importa só o que é usado dessas bibliotecas (reduz o JS inicial).
    optimizePackageImports: ["@react-three/drei", "motion"],
  },
  async headers() {
    const seguranca = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), accelerometer=(self), gyroscope=(self)",
      },
    ];
    return [
      { source: "/:path*", headers: seguranca },
      {
        // Fotos, pôsteres e vídeos: 1 dia de cache e revalidação em segundo plano por 7 dias,
        // para que uma foto trocada com o mesmo nome apareça logo.
        source: "/(images|video|models)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
