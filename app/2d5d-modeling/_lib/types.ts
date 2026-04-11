export type Point2D = [number, number];
export type ColorRGBA = [number, number, number, number];

export interface OutlinePolygon {
  id: string;
  group: "outline";
  basePoints: Point2D[];
  layerIndex: number;
  fillColor: ColorRGBA;
}

export type Polygon = OutlinePolygon;

export interface FaceModel {
  polygons: Polygon[];
}
