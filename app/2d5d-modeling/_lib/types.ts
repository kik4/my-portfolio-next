// Spec: app/2d5d-modeling/_doc/20260503_1316/spec.md

import type { AffineMatrix } from "./affine";

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface HeadOutline {
  enabled: boolean;
  color: string;
  thickness: number;
}

// Front/side silhouette half-curves share a common Y sample list.
//   - halfX: front curve right half-width (X >= 0). 0 at apex / chin.
//   - zFront: side curve front Z coordinate. 0 at apex / chin.
//   - zBack: side curve back Z coordinate (negative or zero). 0 at apex / chin.
export interface HeadMesh {
  ySamples: number[];
  frontHalfXs: number[];
  sideZFronts: number[];
  sideZBacks: number[];
  catmullRomTension: number;
  ringSegments: number;
  fillColor: string;
  outline: HeadOutline;
}

export interface PartShape {
  basePoints: Vec2[];
  closed: boolean;
}

// ===== Parts =====

export interface PartViewKeyframe {
  id: string;
  yaw: number;
  pitch: number;
  shape: PartShape;
  affine: AffineMatrix;
  alpha: number;
  visible: boolean;
}

export interface PartAnimKeyframe {
  id: string;
  paramValues: Record<string, number>;
  shapeDelta: Vec2[];
  affineDelta: AffineMatrix;
  alphaDelta: number;
}

export interface Part {
  id: string;
  name: string;
  groupId: string; // required: every part belongs to a group
  layerIndex: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  viewKeyframes: PartViewKeyframe[]; // at least one
  animKeyframes: PartAnimKeyframe[];
  rbfSigmaView: number;
  rbfSigmaAnim: number;
}

// ===== Groups =====

// Common to both root and child groups.
interface GroupBase {
  id: string;
  name: string;
  visible: boolean;
  rbfSigmaView: number;
  rbfSigmaAnim: number;
}

// Root group: lives in 3D, holds the billboard anchor for its descendant
// parts. parentId === null marks it as a root.
export interface RootGroup extends GroupBase {
  parentId: null;
  anchor: Vec3;
  viewKeyframes: RootGroupViewKeyframe[];
  animKeyframes: RootGroupAnimKeyframe[];
}

export interface RootGroupViewKeyframe {
  id: string;
  yaw: number;
  pitch: number;
  anchor: Vec3;
  affine: AffineMatrix;
  alpha: number;
  visible: boolean;
}

export interface RootGroupAnimKeyframe {
  id: string;
  paramValues: Record<string, number>;
  anchorDelta: Vec3;
  affineDelta: AffineMatrix;
  alphaDelta: number;
}

// Child group: nested inside another group, lives in the parent group's 2D
// billboard plane. Has no anchor.
export interface ChildGroup extends GroupBase {
  parentId: string;
  viewKeyframes: ChildGroupViewKeyframe[];
  animKeyframes: ChildGroupAnimKeyframe[];
}

export interface ChildGroupViewKeyframe {
  id: string;
  yaw: number;
  pitch: number;
  affine: AffineMatrix;
  alpha: number;
  visible: boolean;
}

export interface ChildGroupAnimKeyframe {
  id: string;
  paramValues: Record<string, number>;
  affineDelta: AffineMatrix;
  alphaDelta: number;
}

export type Group = RootGroup | ChildGroup;

export const isRootGroup = (g: Group): g is RootGroup => g.parentId === null;

// ===== Model root =====

export interface AnimParamDef {
  name: string;
  range: [number, number];
  default: number;
}

export interface FaceModel {
  version: 4;
  head: HeadMesh;
  groups: Group[];
  parts: Part[];
  animParams: AnimParamDef[];
  currentAnimParams: Record<string, number>;
}
