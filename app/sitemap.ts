import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { LANDING_PAGES } from "@/lib/landing";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "", priority: 1.0, changeFrequency: "daily" },
    // Category landing pages — the main organic-search targets.
    ...LANDING_PAGES.map((p) => ({
      path: `/buy/${p.slug}`,
      priority: 0.9,
      changeFrequency: "daily" as const,
    })),
    { path: "/signup", priority: 0.8, changeFrequency: "monthly" },
    { path: "/login", priority: 0.5, changeFrequency: "monthly" },
    { path: "/docs/api", priority: 0.6, changeFrequency: "weekly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

  return entries.map((e) => ({
    url: `${SITE_URL}${e.path}`,
    lastModified: now,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }));
}
