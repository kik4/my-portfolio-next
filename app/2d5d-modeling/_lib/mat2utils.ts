import type { Mat2 } from "./types";

export interface Mat2Params {
  rotation: number; // degrees
  scaleX: number;
  scaleY: number;
  shear: number; // x-shear (y-shear is not independent in a 2x2 matrix)
}

/**
 * Compose a Mat2 from rotation, scale, and shear.
 * Order: rotation * shear * scale
 * Matrix = R * [1, shear, 0, 1] * [scaleX, 0, 0, scaleY]
 */
export function composeMat2(params: Mat2Params): Mat2 {
  const rad = (params.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const { scaleX, scaleY, shear } = params;

  // [1, shear, 0, 1] * [scaleX, 0, 0, scaleY] = [scaleX, shear*scaleY, 0, scaleY]
  const a = scaleX;
  const b = shear * scaleY;
  const c = 0;
  const d = scaleY;

  // R * above
  return [
    cos * a + sin * c,
    cos * b + sin * d,
    -sin * a + cos * c,
    -sin * b + cos * d,
  ];
}

/**
 * Decompose a Mat2 into rotation, scale, and shear.
 * Inverse of composeMat2. Exact round-trip for 4-parameter decomposition.
 */
export function decomposeMat2(m: Mat2): Mat2Params {
  const [m00, m01, m10, m11] = m;

  // First column gives rotation + scaleX
  const rotation = (Math.atan2(-m10, m00) * 180) / Math.PI;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Undo rotation: R^T * M
  const a = cos * m00 - sin * m10; // = scaleX
  const b = cos * m01 - sin * m11; // = shear * scaleY
  // c should be ~0
  const d = sin * m01 + cos * m11; // = scaleY

  const scaleX = a || 1;
  const scaleY = d || 1;
  const shear = b / scaleY;

  return { rotation, scaleX, scaleY, shear };
}

export const DEFAULT_MAT2_PARAMS: Mat2Params = {
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  shear: 0,
};

/** Multiply two Mat2: A * B */
export function mulMat2(a: Mat2, b: Mat2): Mat2 {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
  ];
}
