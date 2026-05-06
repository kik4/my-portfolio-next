// Centripetal Catmull-Rom interpolation in 2D. Given a sequence of control
// points P0, P1, ..., Pn (already in screen space), generate a smooth curve
// that passes through each control point. `closed` connects the last point
// back to the first.
//
// Centripetal (alpha = 0.5) is the variant that avoids self-intersections
// and overshoot near sharp corners — preferable for silhouette outlines.

export type Point2 = [number, number];

const sub = (a: Point2, b: Point2): Point2 => [a[0] - b[0], a[1] - b[1]];
const len = (a: Point2): number => Math.hypot(a[0], a[1]);

const tj = (ti: number, pi: Point2, pj: Point2, alpha: number): number => {
  const d = len(sub(pj, pi));
  return ti + d ** alpha;
};

// Sample one Catmull-Rom segment between p1 and p2 with neighbours p0, p3.
// Returns `samples` interior + endpoint points (excluding p1, including p2).
const sampleSegment = (
  p0: Point2,
  p1: Point2,
  p2: Point2,
  p3: Point2,
  samples: number,
  alpha: number,
): Point2[] => {
  const t0 = 0;
  const t1 = tj(t0, p0, p1, alpha);
  const t2 = tj(t1, p1, p2, alpha);
  const t3 = tj(t2, p2, p3, alpha);
  if (t1 === t0 || t2 === t1 || t3 === t2) {
    // Degenerate (coincident points). Fall back to a straight segment.
    return [p2];
  }
  const out: Point2[] = [];
  for (let i = 1; i <= samples; i++) {
    const t = t1 + ((t2 - t1) * i) / samples;
    const a1: Point2 = [
      ((t1 - t) / (t1 - t0)) * p0[0] + ((t - t0) / (t1 - t0)) * p1[0],
      ((t1 - t) / (t1 - t0)) * p0[1] + ((t - t0) / (t1 - t0)) * p1[1],
    ];
    const a2: Point2 = [
      ((t2 - t) / (t2 - t1)) * p1[0] + ((t - t1) / (t2 - t1)) * p2[0],
      ((t2 - t) / (t2 - t1)) * p1[1] + ((t - t1) / (t2 - t1)) * p2[1],
    ];
    const a3: Point2 = [
      ((t3 - t) / (t3 - t2)) * p2[0] + ((t - t2) / (t3 - t2)) * p3[0],
      ((t3 - t) / (t3 - t2)) * p2[1] + ((t - t2) / (t3 - t2)) * p3[1],
    ];
    const b1: Point2 = [
      ((t2 - t) / (t2 - t0)) * a1[0] + ((t - t0) / (t2 - t0)) * a2[0],
      ((t2 - t) / (t2 - t0)) * a1[1] + ((t - t0) / (t2 - t0)) * a2[1],
    ];
    const b2: Point2 = [
      ((t3 - t) / (t3 - t1)) * a2[0] + ((t - t1) / (t3 - t1)) * a3[0],
      ((t3 - t) / (t3 - t1)) * a2[1] + ((t - t1) / (t3 - t1)) * a3[1],
    ];
    out.push([
      ((t2 - t) / (t2 - t1)) * b1[0] + ((t - t1) / (t2 - t1)) * b2[0],
      ((t2 - t) / (t2 - t1)) * b1[1] + ((t - t1) / (t2 - t1)) * b2[1],
    ]);
  }
  return out;
};

// Smooth a sequence of 2D points using centripetal Catmull-Rom.
// `closed` controls whether the curve wraps end-to-start.
// `samplesPerSegment` controls smoothness vs. cost.
export const smoothCatmullRom2D = (
  points: Point2[],
  closed: boolean,
  samplesPerSegment = 12,
  alpha = 0.5,
): Point2[] => {
  const n = points.length;
  if (n < 2) return [...points];
  if (n === 2) return [points[0], points[1]];

  const at = (i: number): Point2 => {
    if (closed) return points[((i % n) + n) % n];
    if (i < 0) return points[0];
    if (i > n - 1) return points[n - 1];
    return points[i];
  };

  const out: Point2[] = [points[0]];
  const segCount = closed ? n : n - 1;
  for (let i = 0; i < segCount; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const seg = sampleSegment(p0, p1, p2, p3, samplesPerSegment, alpha);
    out.push(...seg);
  }
  return out;
};
