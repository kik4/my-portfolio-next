import type {
  ControlFace,
  ControlMesh,
  ControlVertex,
  HeadModel,
  Vec3,
} from "./types";

// Coordinate convention:
//   +Y up (toward the crown)
//   +Z forward (face direction)
//   +X to the character's right
//
// The cage uses 6 horizontal rings stacked in Y, each ring sampled at 8 θ.
// θ is measured around the Y axis; θ=0 points toward +Z (front),
// θ=90° toward +X (right), θ=180° toward -Z (back), θ=270° toward -X (left).
// Top and bottom collapse to single pole vertices.

interface RingSpec {
  y: number;
  // Half-width along X.
  rx: number;
  // Half-depth along Z.
  rz: number;
}

const RINGS: RingSpec[] = [
  // Forehead ring (just below crown)
  { y: 0.25, rx: 0.22, rz: 0.26 },
  // Eye line
  { y: 0.05, rx: 0.28, rz: 0.32 },
  // Nose tip line
  { y: -0.05, rx: 0.27, rz: 0.32 },
  // Mouth line
  { y: -0.2, rx: 0.24, rz: 0.28 },
  // Jaw line (just above the chin pole)
  { y: -0.35, rx: 0.16, rz: 0.2 },
];

const RING_THETA_COUNT = 8;
const CROWN_Y = 0.4;
const CHIN_Y = -0.45;

// Forward push for nose tip and lip vertices to seed the bumps.
const NOSE_PUSH_Z = 0.05;
const LIP_PUSH_Z = 0.02;

// Indices into RINGS (zero-based among the rings array).
const NOSE_RING_INDEX = 2;
const MOUTH_RING_INDEX = 3;

function vertexId(ringIdx: number, thetaIdx: number): string {
  return `v_r${ringIdx}_t${thetaIdx}`;
}

function thetaToAngleRad(thetaIdx: number): number {
  // 0 -> 0 (front, +Z), 2 -> +X, 4 -> -Z, 6 -> -X
  return (thetaIdx / RING_THETA_COUNT) * Math.PI * 2;
}

function ringPosition(ring: RingSpec, thetaIdx: number): Vec3 {
  const a = thetaToAngleRad(thetaIdx);
  const x = Math.sin(a) * ring.rx;
  const z = Math.cos(a) * ring.rz;
  return [x, ring.y, z];
}

function mirrorThetaIdx(thetaIdx: number): number {
  // Mirror across the X=0 plane: θ -> -θ ≡ (count - θ) mod count.
  return (RING_THETA_COUNT - thetaIdx) % RING_THETA_COUNT;
}

export function buildPresetHeadCage(): ControlMesh {
  const vertices: ControlVertex[] = [];
  const faces: ControlFace[] = [];

  // Pole vertices.
  const crownId = "v_crown";
  const chinId = "v_chin";
  vertices.push({ id: crownId, position: [0, CROWN_Y, 0], onMidplane: true });
  vertices.push({ id: chinId, position: [0, CHIN_Y, 0], onMidplane: true });

  // Ring vertices.
  for (let r = 0; r < RINGS.length; r++) {
    const ring = RINGS[r];
    for (let t = 0; t < RING_THETA_COUNT; t++) {
      const id = vertexId(r, t);
      let pos = ringPosition(ring, t);

      // Push the front-center vertex of the nose / mouth rings forward.
      if (t === 0) {
        if (r === NOSE_RING_INDEX) {
          pos = [pos[0], pos[1], pos[2] + NOSE_PUSH_Z];
        } else if (r === MOUTH_RING_INDEX) {
          pos = [pos[0], pos[1], pos[2] + LIP_PUSH_Z];
        }
      }

      const onMidplane = t === 0 || t === RING_THETA_COUNT / 2;
      const v: ControlVertex = {
        id,
        position: pos,
        onMidplane,
      };
      if (!onMidplane) {
        v.mirrorPairId = vertexId(r, mirrorThetaIdx(t));
      }
      vertices.push(v);
    }
  }

  // Quad faces between adjacent rings.
  // Vertex order CCW seen from outside (so the normal points outward).
  for (let r = 0; r < RINGS.length - 1; r++) {
    for (let t = 0; t < RING_THETA_COUNT; t++) {
      const tNext = (t + 1) % RING_THETA_COUNT;
      faces.push({
        id: `f_r${r}_t${t}`,
        vertexIds: [
          vertexId(r, t),
          vertexId(r, tNext),
          vertexId(r + 1, tNext),
          vertexId(r + 1, t),
        ],
      });
    }
  }

  // Crown fan: degenerate quads (crown, ring0[t], ring0[t+1], crown).
  // The duplicated crown id collapses one edge, behaving like a triangle.
  for (let t = 0; t < RING_THETA_COUNT; t++) {
    const tNext = (t + 1) % RING_THETA_COUNT;
    faces.push({
      id: `f_crown_t${t}`,
      vertexIds: [crownId, vertexId(0, t), vertexId(0, tNext), crownId],
    });
  }

  // Chin fan: degenerate quads in the opposite winding.
  const lastRing = RINGS.length - 1;
  for (let t = 0; t < RING_THETA_COUNT; t++) {
    const tNext = (t + 1) % RING_THETA_COUNT;
    faces.push({
      id: `f_chin_t${t}`,
      vertexIds: [
        chinId,
        vertexId(lastRing, tNext),
        vertexId(lastRing, t),
        chinId,
      ],
    });
  }

  return { vertices, faces };
}

export function buildPresetHeadModel(subdivisionLevel = 2): HeadModel {
  return {
    controlMesh: buildPresetHeadCage(),
    subdivisionLevel,
  };
}
