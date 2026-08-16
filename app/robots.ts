import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/routes";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Filtered listing URLs stay crawlable on purpose — each one declares a
        // canonical pointing at the clean path, which consolidates ranking
        // signals. Blocking them here would hide that canonical from the
        // crawler instead.
        disallow: ["/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
