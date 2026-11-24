import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Collaboration refresh actions receive a workspace credential.
  logging: { serverFunctions: false },
  async redirects() {
    return [
      {
        source: "/server-ai-tracked-changes-comments",
        destination: "/server-ai-tracked-changes",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
