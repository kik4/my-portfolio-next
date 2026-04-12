import type { Mat2 } from "./types";

export interface Mat2Params {
  rotation: number; // degrees
  scaleX: number;
  scaleY: number;
  shearX: number;
  shearY: number;
}

/**
 * Compose a Mat2 from rotation, scale, and shear.
 * Order: rotation * shear * scale
 */
export function composeMat2(params: Mat2Params): Mat2 {
  const rad = (params.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const { scaleX, scaleY, shearX, shearY } = params;

  // Shear: [1, shearX, shearY, 1]
  // Scale: [scaleX, 0, 0, scaleY]
  // Shear * Scale: [scaleX, shearX*scaleY, shearY*scaleX, scaleY]
  const a = scaleX;
  const b = shearX * scaleY;
  const c = shearY * scaleX;
  const d = scaleY;

  // Rotation * (Shear * Scale)
  return [
    cos * a + sin * c,
    cos * b + sin * d,
    -sin * a + cos * c,
    -sin * b + cos * d,
  ];
}

/**
 * Decompose a Mat2 into rotation, scale, and shear.
 */
export function decomposeMat2(m: Mat2): Mat2Params {
  const [m00, m01, m10, m11] = m;

  const rotation = (Math.atan2(-m10, m00) * 180) / Math.PI;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Undo rotation: R^T * M
  const a = cos * m00 - sin * m10;
  const b = cos * m01 - sin * m11;
  const c = sin * m00 + cos * m10;
  const d = sin * m01 + cos * m11;

  const scaleX = a || 1;
  const scaleY = d || 1;
  const shearX = b / scaleY;
  const shearY = c / scaleX;

  return { rotation, scaleX, scaleY, shearX, shearY };
}

export const DEFAULT_MAT2_PARAMS: Mat2Params = {
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  shearX: 0,
  shearY: 0,
};
