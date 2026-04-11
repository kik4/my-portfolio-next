import earcut from "earcut";
import type { Point2D } from "./types";

export function triangulate(points: Point2D[]): number[] {
  const flat: number[] = [];
  for (const [x, y] of points) {
    flat.push(x, y);
  }
  return earcut(flat);
}
