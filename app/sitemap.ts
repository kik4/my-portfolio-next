import type { MetadataRoute } from "next";
import { baseUrl } from "./_lib/url";
import { getPathToAlgorithmBitsManipulation } from "./algorithm/bits-manipulation/getPath";
import { getPathToAlgorithmDateObject } from "./algorithm/date-object/getPath";
import { getPathToAlgorithmGettingStarted } from "./algorithm/getting-started/getPath";
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
    {
      url: `${baseUrl}${getPathToAlgorithmGettingStarted()}`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}${getPathToAlgorithmBitsManipulation()}`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}${getPathToAlgorithmDateObject()}`,
      lastModified: new Date(),
    },
  ];
}
