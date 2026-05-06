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

// Selection is a single union state. Multi-select applies only to points;
// edge/face are always single-element. Switching kinds clears the prior
// kind (e.g. clicking an edge clears the point selection).
export type Selection =
  | { kind: "points"; partId: string; pointIndices: number[] }
  | { kind: "edge"; partId: string; edgeIndex: number }
  | { kind: "face"; partId: string; faceIndex: number }
  | null;

// ActiveNode tracks which part/group is the focus of property edits in the
// sidebar (color, name, etc). Independent of mesh-element Selection: clicking
// a point also implicitly activates that point's part, but the user can also
// activate a part/group by name from the tree without selecting any element.
export type ActiveNode =
  | { kind: "part"; id: string }
  | { kind: "group"; id: string }
  | null;
