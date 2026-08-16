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
};

export default withNextIntl(nextConfig);
