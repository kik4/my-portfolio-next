// Centripetal-style Catmull-Rom interpolation over a 1D sequence of values
// keyed by parameter t (e.g. y coordinate). Produces a smooth curve passing
// through every control point. The "tension" parameter loosely matches
// three.js's CatmullRomCurve3: 0.5 = standard, smaller = floppier, larger = tighter.

export interface CatmullRomSample {
  t: number;
  value: number;
}

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

const segmentValue = (
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  u: number,
  tension: number,
): number => {
  // Standard Catmull-Rom spline blend with adjustable tension.
  // tau = 1 - 2 * tension (tension=0.5 -> tau=0 -> classic Catmull-Rom).
  const tau = 1 - 2 * tension;
  const m1 = (1 - tau) * 0.5 * (p2 - p0);
  const m2 = (1 - tau) * 0.5 * (p3 - p1);
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * p1 +
    (u3 - 2 * u2 + u) * m1 +
    (-2 * u3 + 3 * u2) * p2 +
    (u3 - u2) * m2
  );
};

// Sample the curve at parameter t (assumed within [t0, tN-1]).
// samples must be sorted ascending by t. Outside the range the endpoints are clamped.
export const sampleCatmullRom1D = (
  samples: CatmullRomSample[],
  t: number,
  tension: number,
): number => {
  const n = samples.length;
  if (n === 0) return 0;
  if (n === 1) return samples[0].value;
  if (t <= samples[0].t) return samples[0].value;
  if (t >= samples[n - 1].t) return samples[n - 1].value;

  // Find the segment [i, i+1] that contains t.
  let i = 0;
  while (i < n - 1 && samples[i + 1].t <= t) i++;
  const t1 = samples[i].t;
  const t2 = samples[i + 1].t;
  const u = (t - t1) / (t2 - t1);

  const p0 = samples[Math.max(i - 1, 0)].value;
  const p1 = samples[i].value;
  const p2 = samples[i + 1].value;
  const p3 = samples[Math.min(i + 2, n - 1)].value;

  return segmentValue(p0, p1, p2, p3, u, tension);
};

// Linear fallback if the caller wants explicit control. Currently unused but
// handy for debugging.
export const sampleLinear1D = (
  samples: CatmullRomSample[],
  t: number,
): number => {
  const n = samples.length;
  if (n === 0) return 0;
  if (n === 1) return samples[0].value;
  if (t <= samples[0].t) return samples[0].value;
  if (t >= samples[n - 1].t) return samples[n - 1].value;
  let i = 0;
  while (i < n - 1 && samples[i + 1].t <= t) i++;
  const t1 = samples[i].t;
  const t2 = samples[i + 1].t;
  return lerp(samples[i].value, samples[i + 1].value, (t - t1) / (t2 - t1));
};
