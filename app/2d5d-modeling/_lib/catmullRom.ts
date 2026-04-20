import type { Point2D } from "./types";

// Per-endpoint sharpness scales the Catmull-Rom tangent:
//   s=1 → full smooth (standard CR), s=0 → zero tangent (corner).
// Implemented via Hermite basis so each segment can use its own s1/s2.
export function subdivideClosed(
  points: Point2D[],
  segments: number,
): Point2D[] {
  const n = points.length;
  if (n < 3 || segments < 1) return points.slice();

  const out: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const s1 = clamp01(p1[2] ?? 1);
    const s2 = clamp01(p2[2] ?? 1);

    const m1x = 0.5 * s1 * (p2[0] - p0[0]);
    const m1y = 0.5 * s1 * (p2[1] - p0[1]);
    const m2x = 0.5 * s2 * (p3[0] - p1[0]);
    const m2y = 0.5 * s2 * (p3[1] - p1[1]);

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

      out.push([x, y, 0]);
    }
  }
  return out;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
