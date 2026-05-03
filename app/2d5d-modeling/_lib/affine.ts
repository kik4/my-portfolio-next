// 2D affine transform stored as a 6-tuple [a, b, c, d, tx, ty] meaning:
//   | a c tx |
//   | b d ty |
//   | 0 0  1 |
// so [x', y'] = [a*x + c*y + tx, b*x + d*y + ty].
//
// Spec: app/2d5d-modeling/_doc/20260503_1316/spec.md §4.4

export type AffineMatrix = [number, number, number, number, number, number];

export const AFFINE_IDENTITY: AffineMatrix = [1, 0, 0, 1, 0, 0];
export const AFFINE_ZERO: AffineMatrix = [0, 0, 0, 0, 0, 0];

// Compose A∘B (apply B first, then A). Returns the resulting affine.
export const composeAffine = (
  a: AffineMatrix,
  b: AffineMatrix,
): AffineMatrix => {
  const [a0, a1, a2, a3, a4, a5] = a;
  const [b0, b1, b2, b3, b4, b5] = b;
  return [
    a0 * b0 + a2 * b1,
    a1 * b0 + a3 * b1,
    a0 * b2 + a2 * b3,
    a1 * b2 + a3 * b3,
    a0 * b4 + a2 * b5 + a4,
    a1 * b4 + a3 * b5 + a5,
  ];
};

// Apply affine to a 2D point.
export const applyAffine = (
  m: AffineMatrix,
  p: [number, number],
): [number, number] => {
  const [a, b, c, d, tx, ty] = m;
  return [a * p[0] + c * p[1] + tx, b * p[0] + d * p[1] + ty];
};

// Build an affine from semantic parameters. Composition order is
// translate ∘ rotate ∘ shear ∘ scale (so the user sees: scale first, then
// shear, then rotate around origin, then translate).
export interface AffineParams {
  scale: [number, number];
  rotation: number; // degrees
  shear: [number, number]; // [shx, shy] — x-shear and y-shear
  translate: [number, number];
}

export const AFFINE_PARAMS_IDENTITY: AffineParams = {
  scale: [1, 1],
  rotation: 0,
  shear: [0, 0],
  translate: [0, 0],
};

export const composeAffineFromParams = (p: AffineParams): AffineMatrix => {
  const [sx, sy] = p.scale;
  const [shx, shy] = p.shear;
  const theta = (p.rotation * Math.PI) / 180;
  const cs = Math.cos(theta);
  const sn = Math.sin(theta);
  // M2 = R * Sh * S where:
  //   S  = [[sx, 0], [0, sy]]
  //   Sh = [[1, shx], [shy, 1]]
  //   R  = [[cs, -sn], [sn, cs]]
  // Sh*S = [[sx, shx*sy], [shy*sx, sy]]
  // R*(Sh*S) gives the 2x2 below; storage is [a, b, c, d, tx, ty]
  // with a=m00, b=m10, c=m01, d=m11.
  const a = cs * sx - sn * shy * sx;
  const c = cs * shx * sy - sn * sy;
  const b = sn * sx + cs * shy * sx;
  const d = sn * shx * sy + cs * sy;
  return [a, b, c, d, p.translate[0], p.translate[1]];
};

// Add two affines component-wise. Used for anim deltas (each delta is a
// 6-tuple, weighted-summed onto the view-interpolated base).
export const addAffine = (a: AffineMatrix, b: AffineMatrix): AffineMatrix => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
  a[3] + b[3],
  a[4] + b[4],
  a[5] + b[5],
];

// Scale all components of an affine by k (used to weight an anim delta before
// adding it to the base).
export const scaleAffine = (a: AffineMatrix, k: number): AffineMatrix => [
  a[0] * k,
  a[1] * k,
  a[2] * k,
  a[3] * k,
  a[4] * k,
  a[5] * k,
];

// Linear blend a list of affines with the given weights. weights.length must
// equal affines.length; weights need not sum to 1 (the caller decides).
export const blendAffines = (
  affines: AffineMatrix[],
  weights: number[],
): AffineMatrix => {
  const out: AffineMatrix = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < affines.length; i++) {
    const w = weights[i];
    const m = affines[i];
    for (let k = 0; k < 6; k++) out[k] += m[k] * w;
  }
  return out;
};
