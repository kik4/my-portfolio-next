import type { MetadataRoute } from "next";
import { baseUrl } from "./_lib/url";
import { sections } from "./algorithm/_lib/articles";
import { getPathToAlgorithmArticle } from "./algorithm/getPath";
import { getPathToDijkstra } from "./dijkstra/getPath";

// Revalidate sitemap every hour
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Filter articles that have been published (createdAt <= now)
  const publishedArticles = sections.flatMap((section) =>
    section.items
      .filter((content) => new Date(content.createdAt) <= now)
      .map((content) => ({
        url: `${baseUrl}${getPathToAlgorithmArticle(content.slug)}`,
        lastModified: new Date(content.updatedAt),
      })),
  );

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}${getPathToDijkstra()}`,
      lastModified: new Date(),
    },
    ...publishedArticles,
  ];
}
