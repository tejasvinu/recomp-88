import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  env: {
    NEXT_PUBLIC_GOOGLE_AUTH_AVAILABLE:
      process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? "1" : "0",
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        source: "/(.*)",
        headers: [
          // Basic hardening headers (safe in all environments)
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          // Strict-Transport-Security is only honored by browsers over HTTPS,
          // so it is safe to emit even when the origin is locally HTTP.
          {
            key: "Strict-Transport-Security",
            value: "max-age=15552000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            // Next.js requires 'unsafe-inline' for its inline scripts/styles and
            // the app uses no third-party scripts; frame-src is locked to YouTube
            // embeds, connect-src to same-origin (plus dev HMR websocket).
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "object-src 'none'",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob:",
              "font-src 'self' data:",
              "style-src 'self' 'unsafe-inline'",
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
              "worker-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
              isProd
                ? "connect-src 'self'"
                : "connect-src 'self' http://localhost:* ws://localhost:*",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
