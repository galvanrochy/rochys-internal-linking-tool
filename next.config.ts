import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript type-checking crashes the WASM build worker on Windows;
  // types are verified separately via tsc --noEmit and Vercel's Linux build.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
