/**
 * 2D RBF (Radial Basis Function) interpolation.
 *
 * Given a set of keyframes at (yaw, pitch) positions, each with a
 * multi-dimensional value (e.g. point deltas), interpolate the value
 * at an arbitrary (yaw, pitch) query point.
 *
 * Uses Gaussian kernel: φ(r) = exp(-(εr)²)
 */

type Vec = number[];

interface RBFKeyframe {
  yaw: number;
  pitch: number;
  values: Vec; // flattened value at this keyframe
}

interface RBFInterpolator {
  interpolate: (yaw: number, pitch: number) => Vec;
}

const EPSILON = 0.02; // kernel width (in degrees⁻¹)

function gaussian(r: number): number {
  const er = EPSILON * r;
  return Math.exp(-(er * er));
}

function distance(y1: number, p1: number, y2: number, p2: number): number {
  const dy = y1 - y2;
  const dp = p1 - p2;
  return Math.sqrt(dy * dy + dp * dp);
}

/**
 * Solve linear system Ax = b using Gaussian elimination with partial pivoting.
 * A is n×n, b is n×m (multiple right-hand sides).
 * Returns x as n×m array.
 */
function solveLinear(A: number[][], b: number[][]): number[][] {
  const n = A.length;
  const m = b[0].length;

  // Augment A with b
  const aug: number[][] = [];
  for (let i = 0; i < n; i++) {
    aug[i] = [...A[i], ...b[i]];
  }

  // Forward elimination
  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(aug[row][col]);
      if (v > maxVal) {
        maxVal = v;
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / pivot;
      for (let j = col; j < n + m; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const x: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let row = n - 1; row >= 0; row--) {
    const pivot = aug[row][row];
    if (Math.abs(pivot) < 1e-12) continue;
    for (let j = 0; j < m; j++) {
      let sum = aug[row][n + j];
      for (let col = row + 1; col < n; col++) {
        sum -= aug[row][col] * x[col][j];
      }
      x[row][j] = sum / pivot;
    }
  }
  return x;
}

/**
 * Build an RBF interpolator from keyframes.
 * If no keyframes, returns zero vector.
 *
 * `lambda` adds a Tikhonov regularization term to the diagonal of Φ.
 * lambda=0 is the unregularized interpolator (passes through every KF exactly).
 * Small positive λ trades exact interpolation for reduced overshoot between KFs.
 */
export function buildRBFInterpolator(
  keyframes: RBFKeyframe[],
  lambda = 0,
): RBFInterpolator {
  const n = keyframes.length;

  if (n === 0) {
    return {
      interpolate: () => [],
    };
  }

  const dim = keyframes[0].values.length;

  if (n === 1) {
    const v = keyframes[0].values;
    return {
      interpolate: () => v.slice(),
    };
  }

  // Build kernel matrix Φ (n×n) with optional Tikhonov regularization.
  const Phi: number[][] = [];
  for (let i = 0; i < n; i++) {
    Phi[i] = [];
    for (let j = 0; j < n; j++) {
      const r = distance(
        keyframes[i].yaw,
        keyframes[i].pitch,
        keyframes[j].yaw,
        keyframes[j].pitch,
      );
      Phi[i][j] = gaussian(r) + (i === j ? lambda : 0);
    }
  }

  // Build value matrix V (n×dim)
  const V: number[][] = [];
  for (let i = 0; i < n; i++) {
    V[i] = keyframes[i].values.slice();
  }

  // Solve Φ * W = V for weights W (n×dim)
  const W = solveLinear(Phi, V);

  return {
    interpolate: (yaw: number, pitch: number): Vec => {
      const result = new Array(dim).fill(0);
      for (let i = 0; i < n; i++) {
        const r = distance(yaw, pitch, keyframes[i].yaw, keyframes[i].pitch);
        const phi = gaussian(r);
        for (let d = 0; d < dim; d++) {
          result[d] += W[i][d] * phi;
        }
      }
      return result;
    },
  };
}
