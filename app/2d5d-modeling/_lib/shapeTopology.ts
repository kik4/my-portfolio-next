import type { Part, Vec2 } from "./types";

// Insert a new control point into a part's shape at insertIndex. The same
// topology change is propagated to *every* viewKeyframe and animKeyframe of
// the part so all of them keep matching point counts (an invariant the view
// RBF + anim composition rely on).
//
// Per-keyframe insertion strategy:
//   - The keyframe whose camera angle matches the user's current view (the
//     one whose shape they're looking at while editing) gets the explicit
//     position.
//   - All other view keyframes get a position interpolated along the same
//     segment in their own shape (so the visual "the new point sits on the
//     edge between A and B" reads correctly in every keyframe).
//   - All anim keyframes get a zero-delta entry (additive identity).
//
// `editedKfIndex` selects which view keyframe receives `position` verbatim.
export const insertShapePoint = (
  part: Part,
  editedKfIndex: number,
  insertIndex: number,
  position: Vec2,
): Part => {
  const sourceKf = part.viewKeyframes[editedKfIndex];
  if (!sourceKf) return part;
  const sourcePoints = sourceKf.shape.basePoints;
  if (insertIndex < 0 || insertIndex > sourcePoints.length) return part;

  // For non-edited keyframes we need a "where would this new point land in
  // their shape" — use the same fractional t along the same segment. The
  // source shape provides that t (0..1) which we apply to each other shape.
  const t = computeSegmentParam(sourcePoints, insertIndex, position);

  const nextViewKfs = part.viewKeyframes.map((kf, i) => {
    let newPoint: Vec2;
    if (i === editedKfIndex) {
      newPoint = position;
    } else {
      newPoint = interpolateOnSegment(kf.shape.basePoints, insertIndex, t);
    }
    return {
      ...kf,
      shape: {
        ...kf.shape,
        basePoints: insertAt(kf.shape.basePoints, insertIndex, newPoint),
      },
    };
  });

  const nextAnimKfs = part.animKeyframes.map((kf) => ({
    ...kf,
    shapeDelta: insertAt(kf.shapeDelta, insertIndex, [0, 0] as Vec2),
  }));

  return {
    ...part,
    viewKeyframes: nextViewKfs,
    animKeyframes: nextAnimKfs,
  };
};

// Remove the control point at the given index from every shape and shapeDelta
// belonging to the part. No-op if removing would leave fewer than 3 points
// (PointEditor enforces the same floor in its UI).
export const removeShapePoint = (part: Part, removeIndex: number): Part => {
  const baseLen = part.viewKeyframes[0]?.shape.basePoints.length ?? 0;
  if (baseLen <= 3) return part;
  if (removeIndex < 0 || removeIndex >= baseLen) return part;

  const nextViewKfs = part.viewKeyframes.map((kf) => ({
    ...kf,
    shape: {
      ...kf.shape,
      basePoints: kf.shape.basePoints.filter((_, i) => i !== removeIndex),
    },
  }));
  const nextAnimKfs = part.animKeyframes.map((kf) => ({
    ...kf,
    shapeDelta: kf.shapeDelta.filter((_, i) => i !== removeIndex),
  }));
  return {
    ...part,
    viewKeyframes: nextViewKfs,
    animKeyframes: nextAnimKfs,
  };
};

const insertAt = <T>(arr: T[], index: number, value: T): T[] => [
  ...arr.slice(0, index),
  value,
  ...arr.slice(index),
];

// Project `position` onto the segment between points[insertIndex - 1] and
// points[insertIndex] (with wraparound for closed shapes — but here we
// assume the caller chose a sensible insertIndex so the segment exists).
// Returns the parameter t in [0, 1] along that segment.
const computeSegmentParam = (
  points: Vec2[],
  insertIndex: number,
  position: Vec2,
): number => {
  const n = points.length;
  if (n === 0) return 0;
  // The segment is points[insertIndex - 1] -> points[insertIndex % n].
  // PointEditor's nearestSegmentInsertIndex returns insertIndex = i+1 where
  // segment i is points[i] -> points[(i+1) % n], so we recover i = insertIndex-1.
  const a = points[(insertIndex - 1 + n) % n];
  const b = points[insertIndex % n];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return 0.5;
  let t = ((position[0] - a[0]) * dx + (position[1] - a[1]) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return t;
};

// Linearly interpolate at parameter t along the same segment in another
// shape, returning the resulting (x, y).
const interpolateOnSegment = (
  points: Vec2[],
  insertIndex: number,
  t: number,
): Vec2 => {
  const n = points.length;
  if (n === 0) return [0, 0];
  const a = points[(insertIndex - 1 + n) % n];
  const b = points[insertIndex % n];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
};
