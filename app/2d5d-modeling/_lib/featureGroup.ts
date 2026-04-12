import { buildRBFInterpolator } from "./rbf";
import type { FeatureGroup, Mat2, Point2D, YawPitch } from "./types";
import { MAT2_IDENTITY } from "./types";

interface GroupTransform {
  position: Point2D;
  matrix: Mat2;
}

/**
 * Check if the given angle is within the group's visibility rectangle.
 */
export function isGroupVisible(group: FeatureGroup, angle: YawPitch): boolean {
  const [yawMin, yawMax] = group.visibility.yawRange;
  const [pitchMin, pitchMax] = group.visibility.pitchRange;
  return (
    angle.yaw >= yawMin &&
    angle.yaw <= yawMax &&
    angle.pitch >= pitchMin &&
    angle.pitch <= pitchMax
  );
}

/**
 * Interpolate the group's affine transform at the given angle.
 */
export function interpolateGroupTransform(
  group: FeatureGroup,
  angle: YawPitch,
): GroupTransform {
  if (group.yawPitchKeyframes.length === 0) {
    return { position: [0, 0], matrix: MAT2_IDENTITY };
  }

  // Interpolate deltas from identity to avoid Gaussian decay shrinking the matrix
  const interpolator = buildRBFInterpolator(
    group.yawPitchKeyframes.map((kf) => ({
      yaw: kf.angle.yaw,
      pitch: kf.angle.pitch,
      values: [
        kf.position[0],
        kf.position[1],
        kf.matrix[0] - 1, // delta from identity
        kf.matrix[1],
        kf.matrix[2],
        kf.matrix[3] - 1, // delta from identity
      ],
    })),
  );

  const v = interpolator.interpolate(angle.yaw, angle.pitch);
  return {
    position: [v[0], v[1]],
    matrix: [v[2] + 1, v[3], v[4], v[5] + 1], // add identity back
  };
}

/**
 * Resolve the group's effective layerIndex using nearest-neighbor selection.
 */
export function resolveGroupLayerIndex(
  group: FeatureGroup,
  angle: YawPitch,
): number {
  if (!group.layerIndexKeyframes || group.layerIndexKeyframes.length === 0) {
    return group.baseLayerIndex;
  }

  let nearest = group.layerIndexKeyframes[0];
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const kf of group.layerIndexKeyframes) {
    const dy = angle.yaw - kf.angle.yaw;
    const dp = angle.pitch - kf.angle.pitch;
    const dist = dy * dy + dp * dp;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = kf;
    }
  }
  return nearest.layerIndex;
}

/**
 * Compose group transform with local polygon transform.
 * matFinal = matGroup * matLocal
 * posFinal = matGroup * posLocal + posGroup
 */
export function composeTransforms(
  groupPos: Point2D,
  groupMat: Mat2,
  localPos: Point2D,
  localMat: Mat2,
): { position: Point2D; matrix: Mat2 } {
  // Matrix multiplication: matGroup * matLocal
  const [g00, g01, g10, g11] = groupMat;
  const [l00, l01, l10, l11] = localMat;
  const matrix: Mat2 = [
    g00 * l00 + g01 * l10,
    g00 * l01 + g01 * l11,
    g10 * l00 + g11 * l10,
    g10 * l01 + g11 * l11,
  ];

  // Position: matGroup * posLocal + posGroup
  const position: Point2D = [
    g00 * localPos[0] + g01 * localPos[1] + groupPos[0],
    g10 * localPos[0] + g11 * localPos[1] + groupPos[1],
  ];

  return { position, matrix };
}
