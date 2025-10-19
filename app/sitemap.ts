import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://kik4.work";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/dijkstra`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/algorithm/getting-started`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/algorithm/bits-manipulation`,
      lastModified: new Date(),
    },
  ];
}
