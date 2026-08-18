import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Tutor avatars live in Supabase Storage.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  experimental: {
    // Arabic/Hebrew webfonts are heavy; keep the critical CSS inline.
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        /*
         * The service worker must never be served from a long-lived cache.
         *
         * Everything else under `public/` is content-addressed or effectively
         * immutable, but this one file is the update mechanism for itself:
         * a copy pinned in a CDN or a browser cache is a worker that can never
         * be replaced, on a device nobody can reach. Browsers now bypass the
         * HTTP cache when checking for a new worker, but that is recent
         * behaviour and the header costs nothing.
         */
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
