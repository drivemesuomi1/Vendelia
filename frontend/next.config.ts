import type { NextConfig } from "next";

// Production has no default API: set BACKEND_URL once the backend is deployed.
const backend = process.env.BACKEND_URL ?? (process.env.NODE_ENV === "production" ? undefined : "http://127.0.0.1:4000");

const nextConfig: NextConfig = {
  // The shared workspace package ships TypeScript source.
  transpilePackages: ["@vendelia/shared"],
  // The browser talks to /api on the same origin; Next forwards it to the backend.
  // Same-origin keeps the session cookie first-party and avoids CORS in the browser.
  async rewrites() {
    if (!backend) return [];
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backend}/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
