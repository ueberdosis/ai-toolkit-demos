import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
