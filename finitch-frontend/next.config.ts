import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; " +
      "img-src 'self' data: https: blob:; " +
      "style-src 'self' 'unsafe-inline'; " +
      "font-src 'self' data:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "connect-src 'self' http://127.0.0.1:8001 http://localhost:8001 http://127.0.0.1:8002 http://localhost:8002 ws: wss:; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "object-src 'none'",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
