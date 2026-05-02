import { animRbfWeights } from "./animRbf";
import type {
  GroupAnimKeyframe,
  GroupTransformDelta,
  GroupViewKeyframe,
  PartGroup,
  PartPlacement,
  Vec2,
  Vec3,
} from "./types";
import { viewRbfWeights } from "./viewRbf";

// Walk from a group up to the root, returning [self, parent, grandparent, ...].
// Detects cycles: if a group's parent chain re-encounters an already-visited
// id, the chain is truncated at that point (so the function never infinite-
// loops on bad data, but the caller should treat that as a corruption).
export const groupAncestorChain = (
  groups: PartGroup[],
  startId: string | undefined,
): PartGroup[] => {
  if (!startId) return [];
  const byId = new Map(groups.map((g) => [g.id, g]));
  const chain: PartGroup[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined = startId;
  while (cursor) {
    if (seen.has(cursor)) break; // cycle
    seen.add(cursor);
    const g = byId.get(cursor);
    if (!g) break;
    chain.push(g);
    cursor = g.parentId;
  }
  return chain;
};

// True if making `proposedParent` the parent of `child` would form a cycle.
// (Including the trivial case where `proposedParent === child`.)
export const wouldCreateCycle = (
  groups: PartGroup[],
  childId: string,
  proposedParentId: string | undefined,
): boolean => {
  if (!proposedParentId) return false;
  if (proposedParentId === childId) return true;
  const ancestors = groupAncestorChain(groups, proposedParentId);
  return ancestors.some((g) => g.id === childId);
};

// True if any group in the ancestor chain (including self) has visible=false.
export const isGroupChainVisible = (
  groups: PartGroup[],
  groupId: string | undefined,
): boolean => {
  if (!groupId) return true;
  const chain = groupAncestorChain(groups, groupId);
  return chain.every((g) => g.visible);
};

const ZERO_DELTA: GroupTransformDelta = {
  anchorDelta: [0, 0, 0],
  rotationOffsetDelta: [0, 0, 0],
  scaleDelta: [0, 0],
};

// View-RBF blend the group's viewKeyframes at the current camera angles.
// Returns a transformDelta (each component is the weighted average of the
// keyframes' values; weights normalized as in viewRbf).
export const interpolateGroupViewKeyframes = (
  keyframes: GroupViewKeyframe[],
  yaw: number,
  pitch: number,
  sigmaDeg: number,
): GroupTransformDelta => {
  if (keyframes.length === 0) return ZERO_DELTA;
  if (keyframes.length === 1) return keyframes[0].transformDelta;
  const weights = viewRbfWeights(keyframes, yaw, pitch, sigmaDeg);
  let ax = 0;
  let ay = 0;
  let az = 0;
  let rx = 0;
  let ry = 0;
  let rz = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < keyframes.length; i++) {
    const w = weights[i];
    const d = keyframes[i].transformDelta;
    ax += d.anchorDelta[0] * w;
    ay += d.anchorDelta[1] * w;
    az += d.anchorDelta[2] * w;
    rx += d.rotationOffsetDelta[0] * w;
    ry += d.rotationOffsetDelta[1] * w;
    rz += d.rotationOffsetDelta[2] * w;
    sx += d.scaleDelta[0] * w;
    sy += d.scaleDelta[1] * w;
  }
  return {
    anchorDelta: [ax, ay, az],
    rotationOffsetDelta: [rx, ry, rz],
    scaleDelta: [sx, sy],
  };
};

// Layer the group's animKeyframes onto the view-interpolated base. Anim
// weights are *not* normalized (matches Part anim semantics): each keyframe's
// distance-attenuated weight scales its own delta and adds in.
export const composeGroupViewWithAnim = (
  base: GroupTransformDelta,
  anim: GroupAnimKeyframe[],
  currentParams: Record<string, number>,
  sigma: number,
): GroupTransformDelta => {
  if (anim.length === 0) return base;
  const weights = animRbfWeights(anim, currentParams, sigma);
  let ax = base.anchorDelta[0];
  let ay = base.anchorDelta[1];
  let az = base.anchorDelta[2];
  let rx = base.rotationOffsetDelta[0];
  let ry = base.rotationOffsetDelta[1];
  let rz = base.rotationOffsetDelta[2];
  let sx = base.scaleDelta[0];
  let sy = base.scaleDelta[1];
  for (let i = 0; i < anim.length; i++) {
    const w = weights[i];
    if (w === 0) continue;
    const d = anim[i].transformDelta;
    ax += d.anchorDelta[0] * w;
    ay += d.anchorDelta[1] * w;
    az += d.anchorDelta[2] * w;
    rx += d.rotationOffsetDelta[0] * w;
    ry += d.rotationOffsetDelta[1] * w;
    rz += d.rotationOffsetDelta[2] * w;
    sx += d.scaleDelta[0] * w;
    sy += d.scaleDelta[1] * w;
  }
  return {
    anchorDelta: [ax, ay, az],
    rotationOffsetDelta: [rx, ry, rz],
    scaleDelta: [sx, sy],
  };
};

// Resolve a single group's effective transformDelta at the current camera +
// anim state.
export const resolveGroupDelta = (
  group: PartGroup,
  yaw: number,
  pitch: number,
  animParams: Record<string, number>,
): GroupTransformDelta => {
  const base = interpolateGroupViewKeyframes(
    group.viewKeyframes,
    yaw,
    pitch,
    group.rbfSigmaView,
  );
  return composeGroupViewWithAnim(
    base,
    group.animKeyframes,
    animParams,
    group.rbfSigmaAnim,
  );
};

// Apply a chain of pre-resolved transformDeltas (root-most first or leaf-most
// first — both are mathematically equivalent because addition / multiplication
// commute here) to a part's placement. Anchor adds then re-normalizes.
export const applyGroupChainToPlacement = (
  groups: PartGroup[],
  groupId: string | undefined,
  placement: PartPlacement,
  yaw: number,
  pitch: number,
  animParams: Record<string, number>,
): PartPlacement => {
  const chain = groupAncestorChain(groups, groupId);
  if (chain.length === 0) return placement;

  let anchorX = placement.anchor[0];
  let anchorY = placement.anchor[1];
  let anchorZ = placement.anchor[2];
  let rotPitch = placement.rotationOffset[0];
  let rotYaw = placement.rotationOffset[1];
  let rotRoll = placement.rotationOffset[2];
  let scaleX = placement.scale[0];
  let scaleY = placement.scale[1];

  for (const g of chain) {
    const d = resolveGroupDelta(g, yaw, pitch, animParams);
    anchorX += d.anchorDelta[0];
    anchorY += d.anchorDelta[1];
    anchorZ += d.anchorDelta[2];
    rotPitch += d.rotationOffsetDelta[0];
    rotYaw += d.rotationOffsetDelta[1];
    rotRoll += d.rotationOffsetDelta[2];
    scaleX *= 1 + d.scaleDelta[0];
    scaleY *= 1 + d.scaleDelta[1];
  }

  const len = Math.hypot(anchorX, anchorY, anchorZ);
  const anchor: Vec3 =
    len > 0 ? [anchorX / len, anchorY / len, anchorZ / len] : [0, 0, 1];
  const scale: Vec2 = [scaleX, scaleY];

  return {
    ...placement,
    anchor,
    rotationOffset: [rotPitch, rotYaw, rotRoll],
    scale,
  };
};
