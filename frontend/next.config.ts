import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "cdn.myanimelist.net",
      },
      {
        protocol: "https",
        hostname: "manga-reader-manga-images-418987949764.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "manga-reader-manga-images-418987949764.s3.us-east-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
