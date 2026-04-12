export type Point2D = [number, number];
export type ColorRGBA = [number, number, number, number];
// 2x2 matrix [m00, m01, m10, m11]
export type Mat2 = [number, number, number, number];

export interface YawPitch {
  yaw: number;
  pitch: number;
}

export interface OutlineKeyframe {
  angle: YawPitch;
  deltas: Point2D[]; // same length as basePoints, offset from base
}

export interface OutlinePolygon {
  id: string;
  group: "outline";
  basePoints: Point2D[];
  layerIndex: number;
  fillColor: ColorRGBA;
  yawPitchKeyframes: OutlineKeyframe[];
}

export interface FeatureKeyframe {
  angle: YawPitch;
  position: Point2D; // translation
  matrix: Mat2; // 2x2 affine
  alpha: number; // opacity at this angle (0-1)
}

export interface FeaturePolygon {
  id: string;
  group: "feature";
  basePoints: Point2D[];
  layerIndex: number;
  fillColor: ColorRGBA;
  baseAlpha: number;
  yawPitchKeyframes: FeatureKeyframe[];
}

export type Polygon = OutlinePolygon | FeaturePolygon;

export interface FaceModel {
  polygons: Polygon[];
}

// Identity matrix for Mat2
export const MAT2_IDENTITY: Mat2 = [1, 0, 0, 1];
