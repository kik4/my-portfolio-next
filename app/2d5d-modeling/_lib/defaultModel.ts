import type { Group, Mesh, Model, Part } from "./types";

const buildCubeMesh = (): Mesh => {
  const s = 0.5;
  return {
    points: [
      [-s, -s, -s],
      [s, -s, -s],
      [s, s, -s],
      [-s, s, -s],
      [-s, -s, s],
      [s, -s, s],
      [s, s, s],
      [-s, s, s],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ],
    // CCW from outside. Two triangles per face.
    faces: [
      [0, 3, 2],
      [0, 2, 1], // -z
      [4, 5, 6],
      [4, 6, 7], // +z
      [0, 1, 5],
      [0, 5, 4], // -y
      [3, 7, 6],
      [3, 6, 2], // +y
      [0, 4, 7],
      [0, 7, 3], // -x
      [1, 2, 6],
      [1, 6, 5], // +x
    ],
  };
};

export const buildDefaultModel = (): Model => {
  const groupId = "group-root";
  const partId = "part-cube";
  const group: Group = {
    id: groupId,
    name: "root",
    parentId: null,
    visible: true,
  };
  const part: Part = {
    id: partId,
    name: "cube",
    groupId,
    visible: true,
    mesh: buildCubeMesh(),
    strokeColor: "#222222",
    fillColor: "#cccccc",
    strokeWidth: 2,
  };
  return {
    version: 5,
    groups: [group],
    parts: [part],
  };
};
