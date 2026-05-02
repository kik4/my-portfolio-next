// Spec: app/2d5d-modeling/_doc/20260430_0130/spec.md

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface HeadOutline {
  enabled: boolean;
  color: string;
  thickness: number;
}

// Front/side silhouette half-curves share a common Y sample list.
// At each Y we keep:
//   - halfX: front curve right half-width (X >= 0). 0 at the apex / chin.
//   - zFront: side curve front Z coordinate. 0 at the apex / chin.
//   - zBack: side curve back Z coordinate (negative or zero). 0 at the apex / chin.
// ySamples is descending (apex first, chin last) but the build code does not
// actually depend on the order.
export interface HeadMesh {
  ySamples: number[];
  frontHalfXs: number[];
  sideZFronts: number[];
  sideZBacks: number[];
  catmullRomTension: number; // 0..1, Catmull-Rom tension parameter
  ringSegments: number; // segments per latitude ring
  fillColor: string;
  outline: HeadOutline;
}

export interface PartShape {
  basePoints: Vec2[]; // CCW
  closed: boolean;
}

export interface PartPlacement {
  anchor: Vec3; // direction from head center; expected to be normalized
  offsetNormal: number;
  offsetTangent: Vec2;
  rotationOffset: Vec3; // [pitch, yaw, roll] in degrees
  scale: Vec2;
}

export interface ViewKeyframe {
  id: string;
  yaw: number; // degrees
  pitch: number; // degrees
  shape: PartShape;
  placement: PartPlacement;
  visible: boolean;
  alpha: number;
}

export interface AnimKeyframe {
  id: string;
  paramValues: Record<string, number>;
  shapeDelta: Vec2[]; // same length as basePoints
  placementDelta: {
    anchorDelta: Vec3;
    offsetNormalDelta: number;
    offsetTangentDelta: Vec2;
    rotationOffsetDelta: Vec3;
    scaleDelta: Vec2;
  };
  alphaDelta: number;
}

export interface Part {
  id: string;
  name: string;
  groupId?: string;
  layerIndex: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  viewKeyframes: ViewKeyframe[]; // at least one
  animKeyframes: AnimKeyframe[];
  rbfSigmaView: number;
  rbfSigmaAnim: number;
}

// The transform that a group contributes on top of its descendants'
// placements. Anchor delta is added then re-normalized; rotation delta sums
// in degrees; scale delta is multiplicative so [0,0] = identity, [0.5,0] =
// 1.5x in X.
export interface GroupTransformDelta {
  anchorDelta: Vec3;
  rotationOffsetDelta: Vec3;
  scaleDelta: Vec2;
}

// Group-level view keyframe: at the given (yaw, pitch) the group contributes
// this absolute transformDelta. Multiple keyframes are blended via the same
// view RBF used by part shapes.
export interface GroupViewKeyframe {
  id: string;
  yaw: number; // degrees
  pitch: number; // degrees
  transformDelta: GroupTransformDelta;
}

// Group-level anim keyframe: at the given paramValues, contributes this
// *additional* transform delta on top of the view-interpolated base. Same
// summation rules as part anim deltas.
export interface GroupAnimKeyframe {
  id: string;
  paramValues: Record<string, number>;
  transformDelta: GroupTransformDelta;
}

export interface PartGroup {
  id: string;
  name: string;
  visible: boolean;
  // Optional parent group id, enabling nested group hierarchies. Top-level
  // groups have no parentId. Cycles are not allowed (enforced by the editor /
  // resolver) — see groupAncestorChain in groupTransform.ts.
  parentId?: string;
  // View / anim keyframes for the group's transformDelta. At minimum a single
  // viewKeyframe must exist (the static state). animKeyframes are optional.
  viewKeyframes: GroupViewKeyframe[];
  animKeyframes: GroupAnimKeyframe[];
  rbfSigmaView: number;
  rbfSigmaAnim: number;
}

export interface AnimParamDef {
  name: string;
  range: [number, number];
  default: number;
}

export interface FaceModel {
  version: 3;
  head: HeadMesh;
  parts: Part[];
  groups: PartGroup[];
  animParams: AnimParamDef[];
  currentAnimParams: Record<string, number>;
}
