import type { PartBlendShape, Quaternion, Vec2, Vec3 } from "./types";
import { QUAT_IDENTITY } from "./types";

// Apply blend shape shape deltas to base points (additive Vec2).
export function applyBlendShapePoints(
  basePoints: Vec2[],
  blendShapes: PartBlendShape[],
  weights: Record<string, number>,
): Vec2[] {
  const result: Vec2[] = basePoints.map(([x, y]) => [x, y]);
  for (const bs of blendShapes) {
    const w = weights[bs.id] ?? 0;
    if (w === 0) continue;
    for (let i = 0; i < result.length && i < bs.deltas.length; i++) {
      result[i][0] += bs.deltas[i][0] * w;
      result[i][1] += bs.deltas[i][1] * w;
    }
  }
  return result;
}

// Compute blend-shape contribution to position / orientation / alpha.
export interface BlendShapeTransformResult {
  positionDelta: Vec3;
  orientationDelta: Quaternion;
  alphaMul: number;
}

function quatMul(a: Quaternion, b: Quaternion): Quaternion {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function quatNormalize(q: Quaternion): Quaternion {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  if (len === 0) return [0, 0, 0, 1];
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

// Scale a small-rotation quaternion by `w`. For w in [0,1] this is a slerp from
// identity. For larger weights we still slerp; for negative weights we invert.
function quatPower(q: Quaternion, w: number): Quaternion {
  if (w === 0 || (q[0] === 0 && q[1] === 0 && q[2] === 0)) {
    return [0, 0, 0, 1];
  }
  const qw = Math.max(-1, Math.min(1, q[3]));
  const angle = 2 * Math.acos(qw);
  if (angle === 0) return [0, 0, 0, 1];
  const s = Math.sin(angle / 2);
  if (s === 0) return [0, 0, 0, 1];
  const ax = q[0] / s;
  const ay = q[1] / s;
  const az = q[2] / s;
  const newAngle = angle * w;
  const ns = Math.sin(newAngle / 2);
  return [ax * ns, ay * ns, az * ns, Math.cos(newAngle / 2)];
}

export function computeBlendShapeTransform(
  blendShapes: PartBlendShape[],
  weights: Record<string, number>,
): BlendShapeTransformResult {
  const positionDelta: Vec3 = [0, 0, 0];
  let orientationDelta: Quaternion = [...QUAT_IDENTITY];
  let alphaMul = 1;
  for (const bs of blendShapes) {
    const w = weights[bs.id] ?? 0;
    if (w === 0) continue;
    if (bs.positionDelta) {
      positionDelta[0] += bs.positionDelta[0] * w;
      positionDelta[1] += bs.positionDelta[1] * w;
      positionDelta[2] += bs.positionDelta[2] * w;
    }
    if (bs.orientationDelta) {
      const scaled = quatPower(bs.orientationDelta, w);
      orientationDelta = quatMul(scaled, orientationDelta);
    }
    if (bs.alphaDelta !== undefined) {
      alphaMul += bs.alphaDelta * w;
    }
  }
  return {
    positionDelta,
    orientationDelta: quatNormalize(orientationDelta),
    alphaMul: Math.max(0, Math.min(1, alphaMul)),
  };
}
