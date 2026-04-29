import {
  applyBlendShapePoints,
  computeBlendShapeTransform,
} from "./applyBlendShapes";
import { buildInterpolator } from "./buildInterpolator";
import type {
  InterpolationMode,
  Part,
  Quaternion,
  Vec2,
  Vec3,
  YawPitch,
} from "./types";
import { QUAT_IDENTITY } from "./types";

export interface PartInterpolationResult {
  // Shape after blend shapes + (yaw, pitch) shape deltas. Ready to be embedded
  // into 3D via the resolved tangent frame.
  shape: Vec2[];
  // Per-part position/orientation delta (already includes blend-shape and KF
  // contributions). The caller composes this with the surface frame and any
  // group transform.
  positionDelta: Vec3;
  orientationDelta: Quaternion;
  alpha: number;
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

export function interpolatePart(
  part: Part,
  angle: YawPitch,
  weights: Record<string, number>,
  mode: InterpolationMode,
): PartInterpolationResult {
  // 1. Blend shapes on the shape points.
  const blendedShape = applyBlendShapePoints(
    part.shape.basePoints,
    part.blendShapes,
    weights,
  );

  // 2. Blend-shape transform contributions.
  const bsTransform = computeBlendShapeTransform(part.blendShapes, weights);

  // 3. Interpolate KFs as deltas. Per-control shape delta is interpolated
  //    component-wise; position is Vec3; orientation is per-component quat
  //    interpolation followed by normalize (legacy convention from spec).
  let kfPositionDelta: Vec3 = [0, 0, 0];
  let kfOrientationDelta: Quaternion = [...QUAT_IDENTITY];
  let kfAlphaMul = 1;
  const kfShapeDelta: Vec2[] = part.shape.basePoints.map(() => [0, 0]);

  if (part.yawPitchKeyframes.length > 0) {
    const nPoints = part.shape.basePoints.length;
    const valuesPerKf = (kf: (typeof part.yawPitchKeyframes)[number]) => {
      const vals: number[] = [];
      for (let i = 0; i < nPoints; i++) {
        const d = kf.deltas[i] ?? [0, 0];
        vals.push(d[0], d[1]);
      }
      vals.push(
        kf.positionDelta[0],
        kf.positionDelta[1],
        kf.positionDelta[2],
        kf.orientationDelta[0],
        kf.orientationDelta[1],
        kf.orientationDelta[2],
        kf.orientationDelta[3] - 1, // delta from identity w
        kf.alpha - 1, // delta from 1
      );
      return vals;
    };
    const interpolator = buildInterpolator(
      part.yawPitchKeyframes.map((kf) => ({
        yaw: kf.angle.yaw,
        pitch: kf.angle.pitch,
        values: valuesPerKf(kf),
      })),
      mode,
    );

    const v = interpolator.interpolate(angle.yaw, angle.pitch);
    let cursor = 0;
    for (let i = 0; i < nPoints; i++) {
      kfShapeDelta[i] = [v[cursor], v[cursor + 1]];
      cursor += 2;
    }
    kfPositionDelta = [v[cursor], v[cursor + 1], v[cursor + 2]];
    cursor += 3;
    kfOrientationDelta = quatNormalize([
      v[cursor],
      v[cursor + 1],
      v[cursor + 2],
      v[cursor + 3] + 1, // restore identity w
    ]);
    cursor += 4;
    kfAlphaMul = Math.max(0, Math.min(1, v[cursor] + 1));
  }

  // 4. Combine: shape = blended + kfDelta; transforms = blendShape * kf.
  const shape: Vec2[] = blendedShape.map((p, i) => [
    p[0] + kfShapeDelta[i][0],
    p[1] + kfShapeDelta[i][1],
  ]);

  const positionDelta: Vec3 = [
    bsTransform.positionDelta[0] + kfPositionDelta[0],
    bsTransform.positionDelta[1] + kfPositionDelta[1],
    bsTransform.positionDelta[2] + kfPositionDelta[2],
  ];
  const orientationDelta = quatNormalize(
    quatMul(kfOrientationDelta, bsTransform.orientationDelta),
  );
  const alpha = Math.max(
    0,
    Math.min(1, part.baseAlpha * kfAlphaMul * bsTransform.alphaMul),
  );

  return { shape, positionDelta, orientationDelta, alpha };
}
