import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
    lockDistDir: false,
  },
  transpilePackages: ["@linow/sdk"],
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "xlsx", "mammoth"],
};

export default nextConfig;
