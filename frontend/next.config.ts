import type { NextConfig } from "next";
import path from "node:path";

// Optional external API. Without it, Next's /api route hosts the existing Fastify app.
const backend = process.env.BACKEND_URL?.trim().replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // The shared workspace package ships TypeScript source.
  transpilePackages: ["@vendelia/shared", "@vendelia/backend"],
  // Include backend workspace dependencies in the Vercel server function trace.
  outputFileTracingRoot: path.resolve(import.meta.dirname, ".."),
  serverExternalPackages: ["fastify", "@fastify/cors", "postgres", "drizzle-orm"],
  // API requests are handled by app/api/[...path], in-process or via BACKEND_URL.
  async rewrites() {
    if (!backend) return [];
    return [
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
