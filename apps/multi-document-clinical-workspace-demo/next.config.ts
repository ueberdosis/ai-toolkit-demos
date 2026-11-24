import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: { serverFunctions: false },
  experimental: { cpus: 2 },
  // This app is independently installable and has no imports from its parent repo.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
