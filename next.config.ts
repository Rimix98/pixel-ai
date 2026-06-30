import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "better-sqlite3"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
    {
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store" },
      ],
    },
  ],
};

export default nextConfig;
