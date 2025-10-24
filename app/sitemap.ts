import type { MetadataRoute } from "next";
import { baseUrl } from "./_lib/url";
import { sections } from "./algorithm/_lib/articles";
import { getPathToAlgorithmArticle } from "./algorithm/getPath";
import { getPathToDijkstra } from "./dijkstra/getPath";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}${getPathToDijkstra()}`,
      lastModified: new Date(),
    },
    // Algorithm section
    ...sections[0].items.map((content) => ({
      url: `${baseUrl}${getPathToAlgorithmArticle(content.slug)}`,
      lastModified: new Date(),
    })),
  ];
}
