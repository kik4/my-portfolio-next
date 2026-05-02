import * as THREE from "three";
import type { PartPlacement } from "./types";

const HEAD_CENTER = new THREE.Vector3(0, 0, 0);
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const WORLD_FORWARD = new THREE.Vector3(0, 0, 1);

export interface PlacementResult {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

// Resolve a PartPlacement against the head mesh:
//   1. Cast a ray from the head center in the anchor direction.
//   2. The first hit becomes the surface point and the face normal is taken
//      as the outward normal (this is more stable than smoothed vertex normals
//      near degenerate triangles).
//   3. Build a tangent plane (normal, tangent, bitangent) using world up as a
//      reference (falling back to world forward at the singular poles).
//   4. Apply offsetNormal along the normal, offsetTangent in the tangent plane,
//      and rotationOffset (pitch->yaw->roll, intrinsic) on top of the
//      orientation that aligns local +Z with the surface normal.
//
// If the ray misses the mesh (shouldn't happen for a closed head mesh, but
// defensive), we fall back to placing the part on a unit sphere in the anchor
// direction.
export const resolvePlacement = (
  placement: PartPlacement,
  headMesh: THREE.Mesh,
): PlacementResult => {
  const anchor = new THREE.Vector3(...placement.anchor);
  const anchorLen = anchor.length();
  if (anchorLen === 0) {
    anchor.set(0, 0, 1);
  } else {
    anchor.divideScalar(anchorLen);
  }

  const raycaster = new THREE.Raycaster(HEAD_CENTER, anchor, 0, 100);
  const hits = raycaster.intersectObject(headMesh, false);

  let surfacePoint: THREE.Vector3;
  let normal: THREE.Vector3;
  if (hits.length > 0 && hits[0].face) {
    surfacePoint = hits[0].point.clone();
    normal = hits[0].face.normal
      .clone()
      .transformDirection(headMesh.matrixWorld)
      .normalize();
  } else {
    surfacePoint = anchor.clone();
    normal = anchor.clone();
  }

  // Tangent plane. Use world up projected onto the tangent plane as bitangent.
  // At the poles (normal nearly parallel to world up) fall back to world forward.
  const referenceUp =
    Math.abs(normal.dot(WORLD_UP)) > 0.95 ? WORLD_FORWARD : WORLD_UP;
  const bitangent = referenceUp
    .clone()
    .sub(normal.clone().multiplyScalar(normal.dot(referenceUp)))
    .normalize();
  const tangent = new THREE.Vector3()
    .crossVectors(bitangent, normal)
    .normalize();

  // Final position: surface point + offsetNormal * normal + offsetTangent in tangent plane.
  const position = surfacePoint
    .clone()
    .addScaledVector(normal, placement.offsetNormal)
    .addScaledVector(tangent, placement.offsetTangent[0])
    .addScaledVector(bitangent, placement.offsetTangent[1]);

  // Base orientation: local +Z -> normal, local +Y -> bitangent, local +X -> tangent.
  const basisMatrix = new THREE.Matrix4().makeBasis(tangent, bitangent, normal);
  const qBase = new THREE.Quaternion().setFromRotationMatrix(basisMatrix);

  // Apply rotationOffset (degrees) as an intrinsic Pitch->Yaw->Roll rotation.
  const [pitchDeg, yawDeg, rollDeg] = placement.rotationOffset;
  const qOffset = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(pitchDeg),
      THREE.MathUtils.degToRad(yawDeg),
      THREE.MathUtils.degToRad(rollDeg),
      "XYZ",
    ),
  );
  const quaternion = qBase.multiply(qOffset);

  return { position, quaternion };
};
