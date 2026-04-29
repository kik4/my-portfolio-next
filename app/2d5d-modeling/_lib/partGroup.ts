import { buildInterpolator } from "./buildInterpolator";
import type {
  InterpolationMode,
  PartGroup,
  Quaternion,
  Vec3,
  YawPitch,
} from "./types";
import { QUAT_IDENTITY } from "./types";

export function isGroupVisible(group: PartGroup, angle: YawPitch): boolean {
  const [yMin, yMax] = group.visibility.yawRange;
  const [pMin, pMax] = group.visibility.pitchRange;
  return (
    angle.yaw >= yMin &&
    angle.yaw <= yMax &&
    angle.pitch >= pMin &&
    angle.pitch <= pMax
  );
}

export interface GroupTransform {
  positionDelta: Vec3;
  orientationDelta: Quaternion;
}

function quatNormalize(q: Quaternion): Quaternion {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  if (len === 0) return [0, 0, 0, 1];
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

export function interpolateGroupTransform(
  group: PartGroup,
  angle: YawPitch,
  mode: InterpolationMode,
): GroupTransform {
  if (group.yawPitchKeyframes.length === 0) {
    return { positionDelta: [0, 0, 0], orientationDelta: [...QUAT_IDENTITY] };
  }
  const interpolator = buildInterpolator(
    group.yawPitchKeyframes.map((kf) => ({
      yaw: kf.angle.yaw,
      pitch: kf.angle.pitch,
      values: [
        kf.positionDelta[0],
        kf.positionDelta[1],
        kf.positionDelta[2],
        kf.orientationDelta[0],
        kf.orientationDelta[1],
        kf.orientationDelta[2],
        kf.orientationDelta[3] - 1,
      ],
    })),
    mode,
  );
  const v = interpolator.interpolate(angle.yaw, angle.pitch);
  return {
    positionDelta: [v[0], v[1], v[2]],
    orientationDelta: quatNormalize([v[3], v[4], v[5], v[6] + 1]),
  };
}
