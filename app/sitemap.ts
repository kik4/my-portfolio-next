import type { MetadataRoute } from "next";
import { baseUrl } from "./_lib/url";
import { getPathToDijkstra } from "./dijkstra/getPath";
import { sections } from "./typescript/_lib/articles";
import { getPathToTypeScriptArticle } from "./typescript/getPath";

// Revalidate sitemap every hour
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Filter articles that have been published (createdAt <= now)
  const publishedArticles = sections.flatMap((section) =>
    section.items
      .filter((content) => new Date(content.createdAt) <= now)
      .map((content) => ({
        url: `${baseUrl}${getPathToTypeScriptArticle(content.slug)}`,
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
