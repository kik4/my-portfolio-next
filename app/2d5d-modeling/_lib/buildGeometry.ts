import * as THREE from "three";
import { controlMeshToBufferGeometry } from "./catmullClark";
import { subdivideClosed } from "./catmullRom";
import { interpolatePart } from "./interpolatePart";
import { interpolateGroupTransform, isGroupVisible } from "./partGroup";
import { raycastAnchor, resolvePartPlacement } from "./placement";
import { triangulate } from "./triangulate";
import type {
  ColorRGBA,
  FaceModel,
  Quaternion,
  Vec2,
  Vec3,
  YawPitch,
} from "./types";

const SUBDIVISION_SEGMENTS = 8;
// Small per-layerIndex offset along the normal to avoid Z-fighting between
// stacked parts that share an anchor.
const LAYER_NORMAL_STEP = 1e-3;

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

function rotateVec3ByQuat(v: Vec3, q: Quaternion): Vec3 {
  // r = q * v * q^-1, using the standard formula.
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;
  const ix = qw * vx + qy * vz - qz * vy;
  const iy = qw * vy + qz * vx - qx * vz;
  const iz = qw * vz + qx * vy - qy * vx;
  const iw = -qx * vx - qy * vy - qz * vz;
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ];
}

export interface PartRenderItem {
  geometry: THREE.BufferGeometry;
  position: Vec3;
  quaternion: Quaternion;
  fillColor: ColorRGBA;
  fillEnabled: boolean;
  alpha: number;
  // Stroke as a closed loop in local 2D space (XY of the part's frame).
  strokePoints2D: Vec2[] | null;
  strokeColor: ColorRGBA | null;
  strokeWidth: number;
}

export interface FaceGeometryResult {
  headGeometry: THREE.BufferGeometry;
  parts: PartRenderItem[];
}

// Build a 2D filled BufferGeometry from a closed polygon in XY (z=0).
function build2DFillGeometry(points: Vec2[]): THREE.BufferGeometry {
  const tris = triangulate(points);
  const arr = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    arr[i * 3] = points[i][0];
    arr[i * 3 + 1] = points[i][1];
    arr[i * 3 + 2] = 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  geo.setIndex(tris);
  geo.computeBoundingSphere();
  return geo;
}

// Build a temporary mesh from the head model so we can raycast against it.
// The mesh is created without a material since we only need the geometry.
let cachedHeadMesh: THREE.Mesh | null = null;
let cachedHeadKey = "";

function ensureHeadMesh(model: FaceModel): {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
} {
  // Cache key: stringify the control mesh and subdivision level.
  const key = JSON.stringify([
    model.head.controlMesh,
    model.head.subdivisionLevel,
  ]);
  if (key !== cachedHeadKey || !cachedHeadMesh) {
    const geometry = controlMeshToBufferGeometry(
      model.head.controlMesh,
      model.head.subdivisionLevel,
    );
    cachedHeadMesh = new THREE.Mesh(geometry);
    cachedHeadKey = key;
  }
  return {
    mesh: cachedHeadMesh,
    geometry: cachedHeadMesh.geometry as THREE.BufferGeometry,
  };
}

export function buildFaceGeometry(
  model: FaceModel,
  angle: YawPitch,
): FaceGeometryResult {
  const { mesh: headMesh, geometry: headGeometry } = ensureHeadMesh(model);

  // Pre-compute group transforms.
  const groupTransforms = new Map<
    string,
    {
      visible: boolean;
      positionDelta: Vec3;
      orientationDelta: Quaternion;
    }
  >();
  for (const g of model.groups) {
    const visible = isGroupVisible(g, angle);
    if (!visible) {
      groupTransforms.set(g.id, {
        visible: false,
        positionDelta: [0, 0, 0],
        orientationDelta: [0, 0, 0, 1],
      });
      continue;
    }
    const t = interpolateGroupTransform(g, angle, model.interpolationMode);
    groupTransforms.set(g.id, { visible: true, ...t });
  }

  const renderItems: PartRenderItem[] = [];
  const sorted = [...model.parts].sort(
    (a, b) => a.shape.layerIndex - b.shape.layerIndex,
  );

  for (const part of sorted) {
    if (part.groupId) {
      const gt = groupTransforms.get(part.groupId);
      if (gt && !gt.visible) continue;
    }

    const interp = interpolatePart(
      part,
      angle,
      model.blendShapeWeights,
      model.interpolationMode,
    );
    if (interp.alpha <= 0) continue;

    // Resolve surface placement.
    const hit = raycastAnchor(part.placement.anchor, headMesh);
    if (!hit) continue;
    const placed = resolvePartPlacement(part.placement, hit);

    // Compose group transform on top of the surface placement.
    let position: Vec3 = placed.position;
    let orientation: Quaternion = placed.orientation;
    if (part.groupId) {
      const gt = groupTransforms.get(part.groupId);
      if (gt?.visible) {
        // Group position delta is in world space; orientation is composed.
        position = [
          position[0] + gt.positionDelta[0],
          position[1] + gt.positionDelta[1],
          position[2] + gt.positionDelta[2],
        ];
        orientation = quatNormalize(quatMul(gt.orientationDelta, orientation));
      }
    }

    // Apply the per-part KF/blend transform deltas. Position delta is in the
    // part's local frame so it needs to be rotated by the current orientation.
    const rotatedPos = rotateVec3ByQuat(interp.positionDelta, orientation);
    position = [
      position[0] + rotatedPos[0],
      position[1] + rotatedPos[1],
      position[2] + rotatedPos[2],
    ];
    orientation = quatNormalize(quatMul(interp.orientationDelta, orientation));

    // Layer-index offset along the part's local +Z (the surface normal at
    // anchor) to keep parts ordered when they share a frame.
    const layerOffset = part.shape.layerIndex * LAYER_NORMAL_STEP;
    const localZ: Vec3 = [0, 0, 1];
    const layerVec = rotateVec3ByQuat(
      [
        localZ[0] * layerOffset,
        localZ[1] * layerOffset,
        localZ[2] * layerOffset,
      ],
      orientation,
    );
    position = [
      position[0] + layerVec[0],
      position[1] + layerVec[1],
      position[2] + layerVec[2],
    ];

    // Subdivide the 2D shape and build the local-space fill geometry.
    const subdivided = subdivideClosed(interp.shape, SUBDIVISION_SEGMENTS);
    const geo = build2DFillGeometry(subdivided);

    renderItems.push({
      geometry: geo,
      position,
      quaternion: orientation,
      fillColor: part.fillColor,
      fillEnabled: part.fillEnabled,
      alpha: interp.alpha,
      strokePoints2D: part.strokeColor ? subdivided : null,
      strokeColor: part.strokeColor,
      strokeWidth: part.strokeWidth,
    });
  }

  return { headGeometry, parts: renderItems };
}
