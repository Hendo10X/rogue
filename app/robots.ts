import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private / logged-in / machine areas out of the index.
        disallow: [
          "/ozymandias",
          "/api/",
          "/dashboard",
          "/wallet",
          "/orders",
          "/settings",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
