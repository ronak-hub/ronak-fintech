import type { NextConfig } from "next";

const apiOrigin = new URL(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001",
).origin;
const websocketOrigin = apiOrigin.replace(/^http/, "ws");
const scriptPolicy =
  process.env.NODE_ENV === "development"
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";
const isProduction = process.env.NODE_ENV === "production";

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
      `script-src ${scriptPolicy}; ` +
      `connect-src 'self' ${apiOrigin} ${websocketOrigin}; ` +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "object-src 'none'; " +
      "form-action 'self' https://accounts.google.com",
  },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
    : []),
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
