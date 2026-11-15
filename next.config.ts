import type { NextConfig } from "next";
import { headerKeamanan } from "./src/lib/keamanan";

const nextConfig: NextConfig = {
  agentRules: false,
  async headers() {
    return [
      { source: "/:path*", headers: headerKeamanan(process.env.NODE_ENV !== "production") },
      { source: "/maplibre/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/data/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=600, stale-while-revalidate=86400" }] },
    ];
  },
};

export default nextConfig;
