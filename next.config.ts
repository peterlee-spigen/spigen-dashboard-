import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: [{ key: "Cache-Control", value: "no-store" }],
    },
  ],
};

export default nextConfig;
