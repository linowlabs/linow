import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Proactively sync icon.png to public directory so it can be served as /icon.png
try {
  const srcPath = path.join(__dirname, "src/app/icon.png");
  const destPath = path.join(__dirname, "public/icon.png");
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log("Successfully synced icon.png to public/icon.png");
  }
} catch (err) {
  console.error("Error syncing icon.png:", err);
}

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
    lockDistDir: false,
  },
  transpilePackages: ["@linow/sdk"],
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "xlsx", "mammoth"],
};

export default nextConfig;
