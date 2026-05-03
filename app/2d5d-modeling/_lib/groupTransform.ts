import { AFFINE_IDENTITY, type AffineMatrix, composeAffine } from "./affine";
import {
  composeChildGroupViewWithAnim,
  composeRootGroupViewWithAnim,
} from "./animRbf";
import { type Group, isRootGroup, type Vec3 } from "./types";
import {
  interpolateChildGroupViewKeyframes,
  interpolateRootGroupViewKeyframes,
} from "./viewRbf";

// Walk from a group up to its root, returning [self, parent, grandparent, ...,
// root]. Detects cycles defensively.
export const groupAncestorChain = (
  groups: Group[],
  startId: string | undefined,
): Group[] => {
  if (!startId) return [];
  const byId = new Map(groups.map((g) => [g.id, g]));
  const chain: Group[] = [];
  const seen = new Set<string>();
  let cursor: string | null | undefined = startId;
  while (cursor) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const g = byId.get(cursor);
    if (!g) break;
    chain.push(g);
    cursor = g.parentId;
  }
  return chain;
};

export const wouldCreateCycle = (
  groups: Group[],
  childId: string,
  proposedParentId: string | null | undefined,
): boolean => {
  if (!proposedParentId) return false;
  if (proposedParentId === childId) return true;
  const ancestors = groupAncestorChain(groups, proposedParentId);
  return ancestors.some((g) => g.id === childId);
};

export const isGroupChainVisible = (
  groups: Group[],
  groupId: string | undefined,
): boolean => {
  if (!groupId) return true;
  const chain = groupAncestorChain(groups, groupId);
  return chain.every((g) => g.visible);
};

// The fully-resolved transform of a group chain at the current camera + anim
// state. `anchor` is in world space (the billboard plane center). `affine` is
// the chained 2D affine that descendants must apply on top of their own.
// `alpha` is the multiplied chain alpha; `visible` is the AND of chain
// visibilities.
export interface ResolvedGroupChain {
  anchor: Vec3;
  affine: AffineMatrix;
  alpha: number;
  visible: boolean;
}

// Resolve a group chain (leaf → root order from groupAncestorChain). The
// chained affine is composed root-most first (so root.affine ∘ ... ∘ leaf.affine
// matches "apply leaf's local transform first, then walk up to the root").
export const resolveGroupChain = (
  groups: Group[],
  groupId: string,
  yaw: number,
  pitch: number,
  animParams: Record<string, number>,
): ResolvedGroupChain => {
  const chain = groupAncestorChain(groups, groupId);
  if (chain.length === 0) {
    return {
      anchor: [0, 0, 0],
      affine: [...AFFINE_IDENTITY] as AffineMatrix,
      alpha: 1,
      visible: true,
    };
  }

  let anchor: Vec3 = [0, 0, 0];
  let chainAffine: AffineMatrix = [...AFFINE_IDENTITY] as AffineMatrix;
  let alpha = 1;
  let visible = true;

  // Walk from root to leaf so we can compose affines in the natural order
  // (root applied last to a descendant point).
  for (let i = chain.length - 1; i >= 0; i--) {
    const g = chain[i];
    if (!g.visible) visible = false;
    if (isRootGroup(g)) {
      const base = interpolateRootGroupViewKeyframes(
        g.viewKeyframes,
        yaw,
        pitch,
        g.rbfSigmaView,
      );
      const resolved = composeRootGroupViewWithAnim(
        base,
        g.animKeyframes,
        animParams,
        g.rbfSigmaAnim,
      );
      anchor = resolved.anchor;
      chainAffine = composeAffine(resolved.affine, chainAffine);
      alpha *= resolved.alpha;
      if (!resolved.visible) visible = false;
    } else {
      const base = interpolateChildGroupViewKeyframes(
        g.viewKeyframes,
        yaw,
        pitch,
        g.rbfSigmaView,
      );
      const resolved = composeChildGroupViewWithAnim(
        base,
        g.animKeyframes,
        animParams,
        g.rbfSigmaAnim,
      );
      chainAffine = composeAffine(resolved.affine, chainAffine);
      alpha *= resolved.alpha;
      if (!resolved.visible) visible = false;
    }
  }

  return { anchor, affine: chainAffine, alpha, visible };
};
