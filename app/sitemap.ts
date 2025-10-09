import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://kik4.work",
      lastModified: new Date(),
    },
  ];
}
