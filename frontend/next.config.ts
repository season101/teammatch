import type { NextConfig } from "next";
import path from "node:path";

const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  // Django routes end in a slash, so don't let Next strip it.
  skipTrailingSlashRedirect: true,
  // packages/api-client lives outside frontend/
  outputFileTracingRoot: path.join(__dirname, ".."),
  turbopack: { root: path.join(__dirname, "..") },
  async headers() {
    // A new deploy's service worker must not sit behind a cached copy.
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] }];
  },
  async rewrites() {
    return [
      { source: "/api/:path*/", destination: `${apiUrl}/api/:path*/` },
      { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
      { source: "/_allauth/:path*", destination: `${apiUrl}/_allauth/:path*` },
      // Google's OAuth callback, /accounts/google/login/callback/
      { source: "/accounts/:path*/", destination: `${apiUrl}/accounts/:path*/` },
      { source: "/accounts/:path*", destination: `${apiUrl}/accounts/:path*` },
      // Chat socket, /ws/teams/3/. Without the slash rule Channels finds no route.
      { source: "/ws/:path*/", destination: `${apiUrl}/ws/:path*/` },
      { source: "/ws/:path*", destination: `${apiUrl}/ws/:path*` },
    ];
  },
};

export default nextConfig;
