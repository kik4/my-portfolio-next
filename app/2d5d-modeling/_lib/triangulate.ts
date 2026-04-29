import earcut from "earcut";
import type { Vec2 } from "./types";

export function triangulate(points: Vec2[]): number[] {
  const flat: number[] = [];
  for (const [x, y] of points) {
    flat.push(x, y);
  }
  return earcut(flat);
}
