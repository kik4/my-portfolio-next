import type { MetadataRoute } from "next";
import { baseUrl } from "./_lib/url";

export default function sitemap(): MetadataRoute.Sitemap {
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
