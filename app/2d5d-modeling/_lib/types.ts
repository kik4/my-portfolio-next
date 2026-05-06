export type Vec3 = [number, number, number];

export interface Mesh {
  points: Vec3[];
  edges: [number, number][];
  faces: [number, number, number][];
}

export interface Part {
  id: string;
  name: string;
  groupId: string;
  visible: boolean;
  mesh: Mesh;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

export interface Group {
  id: string;
  name: string;
  parentId: string | null;
  visible: boolean;
}

export interface Model {
  version: 5;
  groups: Group[];
  parts: Part[];
}

export type Selection =
  | { kind: "point"; partId: string; pointIndex: number }
  | { kind: "edge"; partId: string; edgeIndex: number }
  | { kind: "face"; partId: string; faceIndex: number }
  | null;
