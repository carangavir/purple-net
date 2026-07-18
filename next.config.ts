import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  experimental: {
    // The import service enforces a 10 MB file limit. Allow a little multipart
    // request overhead so valid 10 MB workbooks reach that validation.
    serverActions: { bodySizeLimit: "12mb" },
  },
  async headers() { return [{ source: "/(.*)", headers: process.env.NODE_ENV === "production" ? [...securityHeaders, { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : securityHeaders }]; },
};
export default nextConfig;
