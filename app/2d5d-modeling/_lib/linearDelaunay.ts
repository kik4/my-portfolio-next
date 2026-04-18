import Delaunator from "delaunator";

/**
 * Linear interpolation over Delaunay triangulation of (yaw, pitch) keyframes.
 *
 * Inside a triangle the value is a barycentric blend of the three KFs (a true
 * convex combination — no overshoot). Outside the convex hull the nearest KF's
 * value is used (clamped). With <3 KFs falls back to nearest-neighbor.
 */

type Vec = number[];

interface Keyframe {
  yaw: number;
  pitch: number;
  values: Vec;
}

interface Interpolator {
  interpolate: (yaw: number, pitch: number) => Vec;
}

function nearestKf(
  keyframes: Keyframe[],
  yaw: number,
  pitch: number,
): Keyframe {
  let best = keyframes[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const kf of keyframes) {
    const dy = kf.yaw - yaw;
    const dp = kf.pitch - pitch;
    const d = dy * dy + dp * dp;
    if (d < bestDist) {
      bestDist = d;
      best = kf;
    }
  }
  return best;
}

// Barycentric coordinates of point P in triangle (A, B, C). Returns null if
// the triangle is degenerate. Coordinates can be negative if P lies outside.
function barycentric(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): [number, number, number] | null {
  const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(denom) < 1e-12) return null;
  const a = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / denom;
  const b = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / denom;
  const c = 1 - a - b;
  return [a, b, c];
}

export function buildLinearDelaunayInterpolator(
  keyframes: Keyframe[],
): Interpolator {
  const n = keyframes.length;
  if (n === 0) return { interpolate: () => [] };

  const dim = keyframes[0].values.length;

  if (n === 1) {
    const v = keyframes[0].values;
    return { interpolate: () => v.slice() };
  }

  if (n === 2) {
    // 2 KFs: linear blend along the line between them, clamped at endpoints.
    const a = keyframes[0];
    const b = keyframes[1];
    const dx = b.yaw - a.yaw;
    const dy = b.pitch - a.pitch;
    const lenSq = dx * dx + dy * dy;
    return {
      interpolate: (yaw: number, pitch: number) => {
        if (lenSq < 1e-12) return a.values.slice();
        const t = Math.max(
          0,
          Math.min(1, ((yaw - a.yaw) * dx + (pitch - a.pitch) * dy) / lenSq),
        );
        const out = new Array(dim);
        for (let d = 0; d < dim; d++) {
          out[d] = a.values[d] * (1 - t) + b.values[d] * t;
        }
        return out;
      },
    };
  }

  // n >= 3: Delaunay triangulate KF positions.
  const coords = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) {
    coords[i * 2] = keyframes[i].yaw;
    coords[i * 2 + 1] = keyframes[i].pitch;
  }
  const d = new Delaunator(coords);
  const triangles = d.triangles;

  return {
    interpolate: (yaw: number, pitch: number): Vec => {
      // Find the triangle containing (yaw, pitch).
      for (let t = 0; t < triangles.length; t += 3) {
        const ia = triangles[t];
        const ib = triangles[t + 1];
        const ic = triangles[t + 2];
        const ka = keyframes[ia];
        const kb = keyframes[ib];
        const kc = keyframes[ic];
        const bary = barycentric(
          yaw,
          pitch,
          ka.yaw,
          ka.pitch,
          kb.yaw,
          kb.pitch,
          kc.yaw,
          kc.pitch,
        );
        if (!bary) continue;
        const [wa, wb, wc] = bary;
        const eps = -1e-6;
        if (wa >= eps && wb >= eps && wc >= eps) {
          const out = new Array(dim);
          for (let dd = 0; dd < dim; dd++) {
            out[dd] =
              wa * ka.values[dd] + wb * kb.values[dd] + wc * kc.values[dd];
          }
          return out;
        }
      }
      // Outside hull — fall back to nearest KF.
      return nearestKf(keyframes, yaw, pitch).values.slice();
    },
  };
}
