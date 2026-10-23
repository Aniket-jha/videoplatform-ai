import type { NextConfig } from "next";

const API = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Proxy the API so auth cookies stay first-party and no CORS is needed.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API}/api/:path*` },
      { source: "/storage/:path*", destination: `${API}/storage/:path*` },
    ];
  },
};

export default nextConfig;
