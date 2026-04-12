export type Point2D = [number, number];
export type ColorRGBA = [number, number, number, number];

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

export type Polygon = OutlinePolygon;

export interface FaceModel {
  polygons: Polygon[];
}
