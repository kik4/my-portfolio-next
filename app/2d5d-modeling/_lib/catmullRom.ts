import type { Vec2 } from "./types";

// Closed Catmull-Rom subdivision in 2D. `segments` is the number of output
// vertices generated per input control point.
export function subdivideClosed(points: Vec2[], segments: number): Vec2[] {
  const n = points.length;
  if (n < 3 || segments < 1) return points.map(([x, y]) => [x, y] as Vec2);

  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const m1x = 0.5 * (p2[0] - p0[0]);
    const m1y = 0.5 * (p2[1] - p0[1]);
    const m2x = 0.5 * (p3[0] - p1[0]);
    const m2y = 0.5 * (p3[1] - p1[1]);

    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const t2 = t * t;
      const t3 = t2 * t;

      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      const x = h00 * p1[0] + h10 * m1x + h01 * p2[0] + h11 * m2x;
      const y = h00 * p1[1] + h10 * m1y + h01 * p2[1] + h11 * m2y;

      out.push([x, y]);
    }
  }
  return out;
}
