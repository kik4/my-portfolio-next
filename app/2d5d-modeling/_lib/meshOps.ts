import type { Mesh, Vec3 } from "./types";

export const movePoint = (mesh: Mesh, index: number, next: Vec3): Mesh => ({
  ...mesh,
  points: mesh.points.map((p, i) => (i === index ? next : p)),
});

export const addPoint = (
  mesh: Mesh,
  p: Vec3,
): { mesh: Mesh; index: number } => {
  const index = mesh.points.length;
  return { mesh: { ...mesh, points: [...mesh.points, p] }, index };
};

const reindexAfterRemove = (
  edges: Mesh["edges"],
  faces: Mesh["faces"],
  removed: number,
): { edges: Mesh["edges"]; faces: Mesh["faces"] } => {
  const remap = (i: number) => (i > removed ? i - 1 : i);
  return {
    edges: edges
      .filter(([a, b]) => a !== removed && b !== removed)
      .map(([a, b]) => [remap(a), remap(b)] as [number, number]),
    faces: faces
      .filter(([a, b, c]) => a !== removed && b !== removed && c !== removed)
      .map(
        ([a, b, c]) =>
          [remap(a), remap(b), remap(c)] as [number, number, number],
      ),
  };
};

export const removePoint = (mesh: Mesh, index: number): Mesh => {
  const { edges, faces } = reindexAfterRemove(mesh.edges, mesh.faces, index);
  return {
    points: mesh.points.filter((_, i) => i !== index),
    edges,
    faces,
  };
};

const sameEdge = (a: [number, number], b: [number, number]) =>
  (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);

export const addEdge = (
  mesh: Mesh,
  a: number,
  b: number,
): { mesh: Mesh; index: number } => {
  if (a === b) return { mesh, index: -1 };
  const existing = mesh.edges.findIndex((e) => sameEdge(e, [a, b]));
  if (existing >= 0) return { mesh, index: existing };
  return {
    mesh: { ...mesh, edges: [...mesh.edges, [a, b]] },
    index: mesh.edges.length,
  };
};

export const removeEdge = (mesh: Mesh, index: number): Mesh => ({
  ...mesh,
  edges: mesh.edges.filter((_, i) => i !== index),
});

export const addFace = (
  mesh: Mesh,
  a: number,
  b: number,
  c: number,
): { mesh: Mesh; index: number } => {
  if (a === b || b === c || a === c) return { mesh, index: -1 };
  return {
    mesh: { ...mesh, faces: [...mesh.faces, [a, b, c]] },
    index: mesh.faces.length,
  };
};

export const removeFace = (mesh: Mesh, index: number): Mesh => ({
  ...mesh,
  faces: mesh.faces.filter((_, i) => i !== index),
});

export const flipFace = (mesh: Mesh, index: number): Mesh => ({
  ...mesh,
  faces: mesh.faces.map((f, i) =>
    i === index ? ([f[0], f[2], f[1]] as [number, number, number]) : f,
  ),
});
