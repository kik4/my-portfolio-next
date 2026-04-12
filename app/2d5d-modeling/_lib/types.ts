export type Point2D = [number, number];
export type ColorRGBA = [number, number, number, number];
// 2x2 matrix [m00, m01, m10, m11]
export type Mat2 = [number, number, number, number];

export interface YawPitch {
  yaw: number;
  pitch: number;
}

// Blend shapes
export interface OutlineBlendShape {
  id: string; // e.g. "cheek_puff"
  deltas: Point2D[]; // same length as basePoints
}

export interface FeatureBlendShape {
  id: string; // e.g. "blink", "smile"
  deltas: Point2D[]; // same length as basePoints
  alphaDelta: number; // additive alpha change
}

// Outline polygon
export interface OutlineKeyframe {
  angle: YawPitch;
  deltas: Point2D[];
}

export interface OutlinePolygon {
  id: string;
  group: "outline";
  basePoints: Point2D[];
  layerIndex: number;
  fillColor: ColorRGBA;
  yawPitchKeyframes: OutlineKeyframe[];
  blendShapes: OutlineBlendShape[];
}

// Feature polygon
export interface FeatureKeyframe {
  angle: YawPitch;
  position: Point2D;
  matrix: Mat2;
  alpha: number;
}

export interface FeaturePolygon {
  id: string;
  group: "feature";
  basePoints: Point2D[];
  layerIndex: number;
  fillColor: ColorRGBA;
  baseAlpha: number;
  yawPitchKeyframes: FeatureKeyframe[];
  blendShapes: FeatureBlendShape[];
  groupId?: string;
}

// Feature group: bundles feature polygons with shared transform and visibility
export interface FeatureGroupKeyframe {
  angle: YawPitch;
  position: Point2D;
  matrix: Mat2;
}

export interface FeatureGroup {
  id: string;
  yawPitchKeyframes: FeatureGroupKeyframe[];
  visibility: {
    yawRange: [number, number];
    pitchRange: [number, number];
  };
  baseLayerIndex: number;
  layerIndexKeyframes?: {
    angle: YawPitch;
    layerIndex: number;
  }[];
}

export type Polygon = OutlinePolygon | FeaturePolygon;

export interface FaceModel {
  polygons: Polygon[];
  featureGroups: FeatureGroup[];
  blendShapeWeights: Record<string, number>;
}

// Identity matrix for Mat2
export const MAT2_IDENTITY: Mat2 = [1, 0, 0, 1];
