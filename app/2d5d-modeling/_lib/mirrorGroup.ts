import type { AffineMatrix } from "./affine";
import type {
  ChildGroup,
  ChildGroupAnimKeyframe,
  ChildGroupViewKeyframe,
  Group,
  Part,
  PartAnimKeyframe,
  PartViewKeyframe,
  RootGroup,
  RootGroupAnimKeyframe,
  RootGroupViewKeyframe,
  Vec2,
  Vec3,
} from "./types";
import { isRootGroup } from "./types";

// Mirror a group (and all its descendants — child groups + parts) across the
// X axis of the billboard plane. Returns the cloned subtree with fresh ids
// and the X-flip applied to every per-frame piece. The returned object is
// independent of the source; later edits to either side don't propagate.
//
// X-flip on a 2x3 affine `M = [a, b, c, d, tx, ty]`:
//
//   M' = F · M · F   where F = diag(-1, 1)
//   [a, b, c, d, tx, ty] → [a, -b, -c, d, -tx, ty]
//
// On a part shape, points are reflected `(x, y) → (-x, y)` and the index
// order is reversed so the polygon winding (CCW/CW) is preserved — earcut
// triangulation depends on it. yaw is sign-flipped so a keyframe that was
// authored for "looking from yaw=+30°" now applies to "yaw=-30°" on the
// mirrored side.

const flipAffine = (m: AffineMatrix): AffineMatrix => [
  m[0],
  -m[1],
  -m[2],
  m[3],
  -m[4],
  m[5],
];

// Affine deltas live in the same 6-component space and transform the same
// way under the X flip.
const flipAffineDelta = flipAffine;

const flipVec3X = (v: Vec3): Vec3 => [-v[0], v[1], v[2]];

const flipBasePoints = (pts: Vec2[]): Vec2[] => {
  const flipped = pts.map((p) => [-p[0], p[1]] as Vec2);
  flipped.reverse();
  return flipped;
};

// Helpers for fresh id minting. We append a millisecond timestamp + a
// monotonic counter so two mirror operations in quick succession don't
// collide.
let counter = 0;
const freshId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${counter++}`;

// ===== part keyframe flips =====

const flipPartViewKeyframe = (k: PartViewKeyframe): PartViewKeyframe => ({
  id: freshId("vk"),
  yaw: -k.yaw,
  pitch: k.pitch,
  shape: {
    basePoints: flipBasePoints(k.shape.basePoints),
    closed: k.shape.closed,
  },
  affine: flipAffine(k.affine),
  alpha: k.alpha,
  visible: k.visible,
});

const flipPartAnimKeyframe = (k: PartAnimKeyframe): PartAnimKeyframe => ({
  id: freshId("ak"),
  paramValues: { ...k.paramValues },
  // shapeDelta is parallel to basePoints; mirror entry-wise then reverse to
  // match the new (also-reversed) base point order.
  shapeDelta: [...k.shapeDelta.map((p) => [-p[0], p[1]] as Vec2)].reverse(),
  affineDelta: flipAffineDelta(k.affineDelta),
  alphaDelta: k.alphaDelta,
});

const flipPart = (p: Part, newGroupId: string): Part => ({
  ...p,
  id: freshId("part"),
  groupId: newGroupId,
  name: `mirror_${p.name}`,
  viewKeyframes: p.viewKeyframes.map(flipPartViewKeyframe),
  animKeyframes: p.animKeyframes.map(flipPartAnimKeyframe),
});

// ===== root group keyframe flips =====

const flipRootViewKeyframe = (
  k: RootGroupViewKeyframe,
): RootGroupViewKeyframe => ({
  id: freshId("gvk"),
  yaw: -k.yaw,
  pitch: k.pitch,
  anchor: flipVec3X(k.anchor),
  affine: flipAffine(k.affine),
  alpha: k.alpha,
  visible: k.visible,
});

const flipRootAnimKeyframe = (
  k: RootGroupAnimKeyframe,
): RootGroupAnimKeyframe => ({
  id: freshId("gak"),
  paramValues: { ...k.paramValues },
  anchorDelta: flipVec3X(k.anchorDelta),
  affineDelta: flipAffineDelta(k.affineDelta),
  alphaDelta: k.alphaDelta,
});

// ===== child group keyframe flips =====

const flipChildViewKeyframe = (
  k: ChildGroupViewKeyframe,
): ChildGroupViewKeyframe => ({
  id: freshId("gvk"),
  yaw: -k.yaw,
  pitch: k.pitch,
  affine: flipAffine(k.affine),
  alpha: k.alpha,
  visible: k.visible,
});

const flipChildAnimKeyframe = (
  k: ChildGroupAnimKeyframe,
): ChildGroupAnimKeyframe => ({
  id: freshId("gak"),
  paramValues: { ...k.paramValues },
  affineDelta: flipAffineDelta(k.affineDelta),
  alphaDelta: k.alphaDelta,
});

// ===== subtree clone =====

export interface MirrorResult {
  groups: Group[]; // newly created groups (mirror of source + all descendants)
  parts: Part[]; // newly created parts under the mirrored subtree
  rootId: string; // id of the cloned top-level mirror group
}

// Clone (and X-flip) `sourceId`'s subtree. The new top-level group is placed
// next to its source in the same parent, with a "mirror_" name prefix.
export const buildMirrorSubtree = (
  groups: Group[],
  parts: Part[],
  sourceId: string,
): MirrorResult | null => {
  const source = groups.find((g) => g.id === sourceId);
  if (!source) return null;

  // Map source group id → mirrored group id, so child groups' parentId can
  // be rewired as we walk the subtree.
  const idMap = new Map<string, string>();
  idMap.set(source.id, freshId("group"));

  // BFS the subtree to collect every descendant group id, then mint a fresh
  // id for each.
  const queue = [source.id];
  const subtreeIds = new Set<string>([source.id]);
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    for (const g of groups) {
      if (g.parentId === cur && !subtreeIds.has(g.id)) {
        subtreeIds.add(g.id);
        idMap.set(g.id, freshId("group"));
        queue.push(g.id);
      }
    }
  }

  const newGroups: Group[] = [];
  for (const g of groups) {
    if (!subtreeIds.has(g.id)) continue;
    const newId = idMap.get(g.id) as string;
    if (isRootGroup(g)) {
      const cloned: RootGroup = {
        id: newId,
        name: g.id === source.id ? `mirror_${g.name}` : g.name,
        parentId: null,
        visible: g.visible,
        viewKeyframes: g.viewKeyframes.map(flipRootViewKeyframe),
        animKeyframes: g.animKeyframes.map(flipRootAnimKeyframe),
        rbfSigmaAnim: g.rbfSigmaAnim,
      };
      newGroups.push(cloned);
    } else {
      // For the top-level source (the one we mirrored), parentId is its
      // own original parent. For descendants, rewire to the mirrored
      // parent in idMap.
      const parentId =
        g.id === source.id ? g.parentId : (idMap.get(g.parentId) as string);
      const cloned: ChildGroup = {
        id: newId,
        name: g.id === source.id ? `mirror_${g.name}` : g.name,
        parentId,
        visible: g.visible,
        viewKeyframes: g.viewKeyframes.map(flipChildViewKeyframe),
        animKeyframes: g.animKeyframes.map(flipChildAnimKeyframe),
        rbfSigmaAnim: g.rbfSigmaAnim,
      };
      newGroups.push(cloned);
    }
  }

  const newParts: Part[] = [];
  for (const p of parts) {
    if (!subtreeIds.has(p.groupId)) continue;
    const newGroupId = idMap.get(p.groupId) as string;
    newParts.push(flipPart(p, newGroupId));
  }

  return {
    groups: newGroups,
    parts: newParts,
    rootId: idMap.get(source.id) as string,
  };
};
