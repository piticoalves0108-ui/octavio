import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Imagens do Unsplash são redimensionadas pela própria CDN deles (ver src/lib/image-loader.ts),
  // então o next/image só gera o srcset responsivo e cuida do lazy loading.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@react-three/drei"],
  },
};

export default nextConfig;
