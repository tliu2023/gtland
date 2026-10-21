import type { NextConfig } from "next";

// product images are served from management-api's MEDIA_URL; read at build time
const media = new URL(process.env.MEDIA_BASE_URL || "http://localhost:8000");

const nextConfig: NextConfig = {
  // self-contained server bundle for the production Docker image
  output: "standalone",
  // disabled: the catalog is DB-backed and changes via the admin, so pages
  // should render dynamically rather than be statically prerendered/cached.
  cacheComponents: false,
  experimental: {
    // dashboard Server Actions accept card image uploads
    serverActions: { bodySizeLimit: "10mb" },
  },
  images: {
    remotePatterns: [
      {
        protocol: media.protocol.replace(":", "") as "http" | "https",
        hostname: media.hostname,
        port: media.port,
        pathname: "/media/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
