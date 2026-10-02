import type { NextConfig } from "next";

// STATIC_EXPORT=1 gera a pasta out/ com HTML estático (útil para pré-visualizar
// ou hospedar em qualquer servidor). Na Vercel, deixe sem essa variável.
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isStaticExport
    ? { output: "export", images: { unoptimized: true }, trailingSlash: true }
    : {}),
};

export default nextConfig;
