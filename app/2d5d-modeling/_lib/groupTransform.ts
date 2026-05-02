import type { PartGroup, PartPlacement, Vec2, Vec3 } from "./types";

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

// Apply the accumulated group deltas to a part's placement. Walks the group
// chain from the part's direct group up to the root, summing deltas. Anchor
// delta is added then re-normalized so the result is a valid unit direction.
// Scale delta is multiplicative ([0,0] = identity).
export const applyGroupChainToPlacement = (
  groups: PartGroup[],
  groupId: string | undefined,
  placement: PartPlacement,
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
    anchorX += g.transformDelta.anchorDelta[0];
    anchorY += g.transformDelta.anchorDelta[1];
    anchorZ += g.transformDelta.anchorDelta[2];
    rotPitch += g.transformDelta.rotationOffsetDelta[0];
    rotYaw += g.transformDelta.rotationOffsetDelta[1];
    rotRoll += g.transformDelta.rotationOffsetDelta[2];
    scaleX *= 1 + g.transformDelta.scaleDelta[0];
    scaleY *= 1 + g.transformDelta.scaleDelta[1];
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
