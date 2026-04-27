import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  env: {
    NEXT_PUBLIC_GOOGLE_AUTH_AVAILABLE:
      process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? "1" : "0",
  },
};

export default nextConfig;
