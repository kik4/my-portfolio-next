import * as THREE from "three";
import type { PartPlacement, Quaternion, Vec2, Vec3 } from "./types";

// ===== Anchor → surface point/normal =====

export interface SurfaceHit {
  point: Vec3;
  normal: Vec3;
}

const RAY_ORIGIN = new THREE.Vector3(0, 0, 0);
const tmpDirection = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

// Cast a ray from the head center along `anchor` and return the closest hit
// against the head mesh. Returns null if the ray misses.
export function raycastAnchor(
  anchor: Vec3,
  headMesh: THREE.Mesh,
): SurfaceHit | null {
  tmpDirection.set(anchor[0], anchor[1], anchor[2]);
  if (tmpDirection.lengthSq() === 0) return null;
  tmpDirection.normalize();
  raycaster.set(RAY_ORIGIN, tmpDirection);
  // Don't use the recursive form -- the head mesh is what we care about.
  const hits = raycaster.intersectObject(headMesh, false);
  if (hits.length === 0) return null;
  const hit = hits[0];
  const point: Vec3 = [hit.point.x, hit.point.y, hit.point.z];

  let normal: Vec3;
  if (hit.face) {
    // Prefer the face normal of the geometry so we don't drag in the mesh's
    // world transform (the head sits at the origin with no rotation anyway).
    normal = [hit.face.normal.x, hit.face.normal.y, hit.face.normal.z];
  } else {
    // Fallback: use the anchor direction.
    normal = [tmpDirection.x, tmpDirection.y, tmpDirection.z];
  }
  return { point, normal };
}

// ===== Tangent frame =====

export interface TangentFrame {
  tangent: Vec3;
  bitangent: Vec3;
  normal: Vec3;
}

const WORLD_UP: Vec3 = [0, 1, 0];
const WORLD_FORWARD: Vec3 = [0, 0, 1];

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function projectAndOrthonormalize(reference: Vec3, normal: Vec3): Vec3 {
  const d = dot(reference, normal);
  return normalize([
    reference[0] - normal[0] * d,
    reference[1] - normal[1] * d,
    reference[2] - normal[2] * d,
  ]);
}

// Tangent frame as in the legacy spec:
//   bitangent = normalize(worldUp - normal * dot(worldUp, normal))
//   tangent   = normalize(cross(bitangent, normal))
// Singularities (head crown / chin) fall back to using world-forward instead.
const SINGULARITY_THRESHOLD = 0.999;
export function buildTangentFrame(normal: Vec3): TangentFrame {
  const n = normalize(normal);
  const useFallback = Math.abs(dot(n, WORLD_UP)) > SINGULARITY_THRESHOLD;
  const reference = useFallback ? WORLD_FORWARD : WORLD_UP;
  const bitangent = projectAndOrthonormalize(reference, n);
  const tangent = normalize(cross(bitangent, n));
  return { tangent, bitangent, normal: n };
}

// ===== Quaternion helpers =====

const DEG2RAD = Math.PI / 180;

function quatFromAxisAngle(axis: Vec3, angle: number): Quaternion {
  const half = angle * 0.5;
  const s = Math.sin(half);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)];
}

function quatMul(a: Quaternion, b: Quaternion): Quaternion {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function quatNormalize(q: Quaternion): Quaternion {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  if (len === 0) return [0, 0, 0, 1];
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

// Quaternion from a basis: tangent = +X axis, bitangent = +Y axis, normal = +Z axis.
function quatFromBasis(frame: TangentFrame): Quaternion {
  const m = new THREE.Matrix4();
  m.makeBasis(
    new THREE.Vector3(frame.tangent[0], frame.tangent[1], frame.tangent[2]),
    new THREE.Vector3(
      frame.bitangent[0],
      frame.bitangent[1],
      frame.bitangent[2],
    ),
    new THREE.Vector3(frame.normal[0], frame.normal[1], frame.normal[2]),
  );
  const q = new THREE.Quaternion();
  q.setFromRotationMatrix(m);
  return [q.x, q.y, q.z, q.w];
}

// rotationOffset = [pitch, yaw, roll] in degrees, applied pitch → yaw → roll.
export function quatFromRotationOffset(rotationOffset: Vec3): Quaternion {
  const [pitchDeg, yawDeg, rollDeg] = rotationOffset;
  const qPitch = quatFromAxisAngle([1, 0, 0], pitchDeg * DEG2RAD);
  const qYaw = quatFromAxisAngle([0, 1, 0], yawDeg * DEG2RAD);
  const qRoll = quatFromAxisAngle([0, 0, 1], rollDeg * DEG2RAD);
  // qOffset = Q_pitch * Q_yaw * Q_roll  (apply pitch first when multiplying a vector)
  return quatMul(quatMul(qPitch, qYaw), qRoll);
}

// ===== Final placement =====

export interface ResolvedPartPlacement {
  position: Vec3;
  orientation: Quaternion;
  frame: TangentFrame;
}

export function resolvePartPlacement(
  placement: PartPlacement,
  hit: SurfaceHit,
): ResolvedPartPlacement {
  const frame = buildTangentFrame(hit.normal);
  const t = frame.tangent;
  const b = frame.bitangent;
  const n = frame.normal;
  const ot: Vec2 = placement.offsetTangent;
  const offN = placement.offsetNormal;

  const position: Vec3 = [
    hit.point[0] + n[0] * offN + t[0] * ot[0] + b[0] * ot[1],
    hit.point[1] + n[1] * offN + t[1] * ot[0] + b[1] * ot[1],
    hit.point[2] + n[2] * offN + t[2] * ot[0] + b[2] * ot[1],
  ];

  const qBase = quatFromBasis(frame);
  const qOffset = quatFromRotationOffset(placement.rotationOffset);
  const orientation = quatNormalize(quatMul(qBase, qOffset));

  return { position, orientation, frame };
}
