import type { ControlMesh, ControlVertex, Vec3 } from "./types";

// Move a control vertex with optional symmetric coupling. Returns a new
// ControlMesh; the caller is responsible for committing it to state.
export function moveVertex(
  mesh: ControlMesh,
  vertexId: string,
  newPos: Vec3,
  symmetric: boolean,
): ControlMesh {
  const idx = mesh.vertices.findIndex((v) => v.id === vertexId);
  if (idx < 0) return mesh;
  const v = mesh.vertices[idx];

  // Apply midplane constraint when symmetric.
  let resolved: Vec3 = newPos;
  if (symmetric && v.onMidplane) {
    resolved = [0, newPos[1], newPos[2]];
  }

  const next = mesh.vertices.slice();
  next[idx] = { ...v, position: resolved };

  if (symmetric && v.mirrorPairId) {
    const partnerIdx = next.findIndex((p) => p.id === v.mirrorPairId);
    if (partnerIdx >= 0) {
      const partner = next[partnerIdx];
      next[partnerIdx] = {
        ...partner,
        position: [-resolved[0], resolved[1], resolved[2]],
      };
    }
  }

  return { vertices: next, faces: mesh.faces };
}

export function findVertex(
  mesh: ControlMesh,
  id: string,
): ControlVertex | undefined {
  return mesh.vertices.find((v) => v.id === id);
}

// Set sharpness on a vertex, mirroring to the symmetric partner when the
// symmetric flag is on. Sharpness is clamped to [0, 1].
export function setVertexSharpness(
  mesh: ControlMesh,
  vertexId: string,
  sharpness: number,
  symmetric: boolean,
): ControlMesh {
  const idx = mesh.vertices.findIndex((v) => v.id === vertexId);
  if (idx < 0) return mesh;
  const clamped = Math.max(0, Math.min(1, sharpness));
  const next = mesh.vertices.slice();
  const v = next[idx];
  next[idx] =
    clamped === 0
      ? { ...v, sharpness: undefined }
      : { ...v, sharpness: clamped };

  if (symmetric && v.mirrorPairId) {
    const partnerIdx = next.findIndex((p) => p.id === v.mirrorPairId);
    if (partnerIdx >= 0) {
      const partner = next[partnerIdx];
      next[partnerIdx] =
        clamped === 0
          ? { ...partner, sharpness: undefined }
          : { ...partner, sharpness: clamped };
    }
  }
  return { vertices: next, faces: mesh.faces };
}
