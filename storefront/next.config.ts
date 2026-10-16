import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // disabled: the catalog is DB-backed and changes via the admin, so pages
  // should render dynamically rather than be statically prerendered/cached.
  cacheComponents: false,
  images: {
    // product images are served by management-api's MEDIA_URL
    remotePatterns: [{ protocol: "http", hostname: "localhost", port: "8000" }],
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
