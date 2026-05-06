import { buildLinearDelaunayInterpolator } from "./linearDelaunay";
import { buildRBFInterpolator } from "./rbf";
import type { InterpolationMode } from "./types";

interface Keyframe {
  yaw: number;
  pitch: number;
  values: number[];
}

interface Interpolator {
  interpolate: (yaw: number, pitch: number) => number[];
}

// Tikhonov damping for the regularized RBF mode. Small enough that exact
// keyframe values are still close to reproduced, large enough to suppress
// the worst overshoot from a near-singular kernel matrix.
const RBF_REGULARIZED_LAMBDA = 0.05;

export function buildInterpolator(
  keyframes: Keyframe[],
  mode: InterpolationMode,
): Interpolator {
  switch (mode) {
    case "rbf-gaussian":
      return buildRBFInterpolator(keyframes, 0);
    case "rbf-gaussian-regularized":
      return buildRBFInterpolator(keyframes, RBF_REGULARIZED_LAMBDA);
    case "linear-delaunay":
      return buildLinearDelaunayInterpolator(keyframes);
  }
}
