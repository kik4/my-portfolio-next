// Basic numeric types
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
// Quaternion as [x, y, z, w]
export type Quaternion = [number, number, number, number];
export type ColorRGBA = [number, number, number, number];

export interface YawPitch {
  yaw: number;
  pitch: number;
}

// ===== Head control mesh =====

export interface ControlVertex {
  id: string;
  position: Vec3;
  // Mirror partner along the X axis. Absent for vertices on the midplane.
  mirrorPairId?: string;
  // When true, X is locked to 0.
  onMidplane: boolean;
  // [0, 1]. 0 = fully smoothed (standard Catmull-Clark), 1 = the vertex is
  // pinned to its position across subdivision (sharp corner). Optional;
  // missing values default to 0.
  sharpness?: number;
}

export interface ControlFace {
  id: string;
  // CCW vertex id list. Quads are the norm; n-gons are tolerated.
  vertexIds: string[];
}

export interface ControlMesh {
  vertices: ControlVertex[];
  faces: ControlFace[];
}

export interface HeadModel {
  controlMesh: ControlMesh;
  // Catmull-Clark iterations. Default 2, capped around 4.
  subdivisionLevel: number;
}

// ===== Part billboards (planar decoration only) =====

export interface PartPlacement {
  // Direction from the head center; expected to be normalized.
  anchor: Vec3;
  offsetNormal: number;
  offsetTangent: Vec2;
  // [pitch, yaw, roll] in degrees.
  rotationOffset: Vec3;
}

export interface PartShape {
  basePoints: Vec2[];
  layerIndex: number;
}

export interface PartKeyframe {
  angle: YawPitch;
  // Per-control-point shape delta. Same length as basePoints.
  deltas: Vec2[];
  positionDelta: Vec3;
  orientationDelta: Quaternion;
  alpha: number;
}

export interface PartBlendShape {
  id: string;
  deltas: Vec2[];
  positionDelta?: Vec3;
  orientationDelta?: Quaternion;
  alphaDelta?: number;
}

export interface Part {
  id: string;
  name: string;

  placement: PartPlacement;
  shape: PartShape;

  fillColor: ColorRGBA;
  fillEnabled: boolean;
  strokeColor: ColorRGBA | null;
  strokeWidth: number;

  baseAlpha: number;

  yawPitchKeyframes: PartKeyframe[];
  blendShapes: PartBlendShape[];

  groupId?: string;
}

// ===== Part group =====

export interface PartGroupKeyframe {
  angle: YawPitch;
  positionDelta: Vec3;
  orientationDelta: Quaternion;
}

export interface PartGroup {
  id: string;
  name: string;
  yawPitchKeyframes: PartGroupKeyframe[];
  visibility: {
    yawRange: [number, number];
    pitchRange: [number, number];
  };
}

// ===== Whole character =====

export type InterpolationMode =
  | "rbf-gaussian"
  | "rbf-gaussian-regularized"
  | "linear-delaunay";

export interface HeadOutline {
  enabled: boolean;
  color: ColorRGBA;
  // Push along the surface normal in world units. Roughly equal to the
  // outline's apparent thickness on a head ~1 unit tall.
  thickness: number;
}

export interface FaceModel {
  head: HeadModel;
  headFillColor: ColorRGBA;
  headOutline: HeadOutline;

  parts: Part[];
  groups: PartGroup[];

  blendShapeWeights: Record<string, number>;
  interpolationMode: InterpolationMode;
}

// Identity quaternion.
export const QUAT_IDENTITY: Quaternion = [0, 0, 0, 1];
