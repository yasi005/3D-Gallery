import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // sample artworks in the room (public domain, Wikimedia Commons)
    remotePatterns: [{ protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**" }],
  },
  turbopack: {
    rules: {
      // GLSL files are imported as plain strings.
      "*.vert": { type: "raw" },
      "*.frag": { type: "raw" },
    },
  },
};

export default nextConfig;
