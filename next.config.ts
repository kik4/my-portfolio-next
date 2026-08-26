import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/algorithm",
        destination: "/typescript",
        permanent: true,
      },
      {
        source: "/algorithm/:slug*",
        destination: "/typescript/:slug*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
