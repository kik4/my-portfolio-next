import * as THREE from "three";
import { type CatmullRomSample, sampleCatmullRom1D } from "./catmullRom";
import type { HeadMesh } from "./types";

// Number of latitude rings between the apex and the chin used for the actual
// rendered geometry. The user-edited ySamples are control points; we sample
// the spline at this many positions to make a smooth surface.
const LATITUDE_DENSITY = 40;

// How far the pole-cap center is pushed outward in Y, expressed as a
// fraction of the cap ring's average radius. 0 = flat disc cap, 1 = full
// hemisphere. 0.25 gives a gentle dome that doesn't read as either pinched
// or pointy. Exported so the silhouette editor can mirror the same lift in
// its 2D drawing of the path.
export const CAP_DOME_RATIO = 0.25;

// The Y-distance from the pole ring to the cap center vertex. Positive
// always — callers add it to apexRow.y or subtract from chinRow.y.
export const capLift = (row: {
  halfX: number;
  zFront: number;
  zBack: number;
}): number => {
  const a = Math.max(row.halfX, 0);
  const b = Math.max((row.zFront - row.zBack) * 0.5, 0);
  return (a + b) * 0.5 * CAP_DOME_RATIO;
};

// Build a BufferGeometry by:
//   1. Sampling the front/side spline at LATITUDE_DENSITY heights.
//   2. At each height, generating a half-ellipse-front + half-ellipse-back ring
//      with `ringSegments` longitude divisions.
//   3. Stitching adjacent rings into quads and capping the apex / chin with fans.
//
// Coordinate convention: +Y up, +Z forward (toward the camera in the default
// front view), +X to the right.
export const buildHeadGeometry = (head: HeadMesh): THREE.BufferGeometry => {
  const { ringSegments, catmullRomTension } = head;

  // Make sure samples are sorted ascending by Y so the spline parameter is monotonic.
  const sortedIndices = [...head.ySamples.keys()].sort(
    (a, b) => head.ySamples[a] - head.ySamples[b],
  );
  const ySorted = sortedIndices.map((i) => head.ySamples[i]);
  const halfXSamples: CatmullRomSample[] = sortedIndices.map((i) => ({
    t: head.ySamples[i],
    value: head.frontHalfXs[i],
  }));
  const zFrontSamples: CatmullRomSample[] = sortedIndices.map((i) => ({
    t: head.ySamples[i],
    value: head.sideZFronts[i],
  }));
  const zBackSamples: CatmullRomSample[] = sortedIndices.map((i) => ({
    t: head.ySamples[i],
    value: head.sideZBacks[i],
  }));

  const yMin = ySorted[0];
  const yMax = ySorted[ySorted.length - 1];

  // Sample evenly between yMin and yMax. mirrorEnds=true gives the spline a
  // steeper tangent at each pole (phantom value = -inner-neighbour) than the
  // default clamp, which keeps the head's silhouette rounded into the cap
  // instead of flaring out into a polygonal-looking edge near the poles.
  type Row = { y: number; halfX: number; zFront: number; zBack: number };
  const rows: Row[] = [];
  for (let row = 0; row < LATITUDE_DENSITY; row++) {
    const u = row / (LATITUDE_DENSITY - 1);
    const y = yMin + (yMax - yMin) * u;
    rows.push({
      y,
      halfX: sampleCatmullRom1D(halfXSamples, y, catmullRomTension, true),
      zFront: sampleCatmullRom1D(zFrontSamples, y, catmullRomTension, true),
      zBack: sampleCatmullRom1D(zBackSamples, y, catmullRomTension, true),
    });
  }

  const totalRows = rows.length;
  const positions: number[] = [];
  const indices: number[] = [];

  // Vertex layout: every row is a full ring of ringStride vertices (no
  // collapsed pole). The two end rings (chin at row 0, apex at row totalRows-1)
  // get capped with a fan that radiates from a center vertex placed at the
  // ring's elliptical center, so the cap is flat-ish but not pinched.
  const ringStride = ringSegments + 1;

  // Emit one ring's vertices at row index `row`.
  const emitRing = (row: number) => {
    const { y, halfX, zFront, zBack } = rows[row];
    const a = Math.max(halfX, 0);
    const center = (zFront + zBack) * 0.5;
    const bFront = Math.max(zFront - center, 0);
    const bBack = Math.max(center - zBack, 0);
    for (let seg = 0; seg <= ringSegments; seg++) {
      const theta = (seg / ringSegments) * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const x = a * sinT;
      // Front half of the ellipse (cos >= 0) uses bFront, back half uses bBack.
      const z = center + (cosT >= 0 ? bFront : bBack) * cosT;
      positions.push(x, y, z);
    }
  };

  for (let row = 0; row < totalRows; row++) emitRing(row);

  // Center cap vertices for chin (front of array) and apex (back). The
  // center sits at the elliptical center of the pole ring (so the cap stays
  // aligned with chin forward poke etc.) but is pushed outward in Y by a
  // fraction of the ring's average radius. This gives a shallow dome rather
  // than a flat disc — the silhouette editor mirrors the same lift so the
  // 2D drawing stays in sync with the 3D mesh.
  const chinRow = rows[0];
  const apexRow = rows[totalRows - 1];
  const chinCenterIndex = totalRows * ringStride;
  positions.push(
    0,
    chinRow.y - capLift(chinRow),
    (chinRow.zFront + chinRow.zBack) * 0.5,
  );
  const apexCenterIndex = chinCenterIndex + 1;
  positions.push(
    0,
    apexRow.y + capLift(apexRow),
    (apexRow.zFront + apexRow.zBack) * 0.5,
  );

  const ringVertexIndex = (row: number, seg: number) => row * ringStride + seg;

  // Stitch adjacent rings into quads (two triangles each).
  // row+1 is higher up the head. Outward-CCW ordering is a0 -> a1 -> b1 -> b0.
  for (let row = 0; row < totalRows - 1; row++) {
    for (let seg = 0; seg < ringSegments; seg++) {
      const a0 = ringVertexIndex(row, seg);
      const a1 = ringVertexIndex(row, seg + 1);
      const b0 = ringVertexIndex(row + 1, seg);
      const b1 = ringVertexIndex(row + 1, seg + 1);
      indices.push(a0, a1, b1);
      indices.push(a0, b1, b0);
    }
  }

  // Bottom cap (chin): fan from chinCenterIndex to the first ring. CCW seen
  // from below means center -> seg+1 -> seg.
  for (let seg = 0; seg < ringSegments; seg++) {
    const r0 = ringVertexIndex(0, seg);
    const r1 = ringVertexIndex(0, seg + 1);
    indices.push(chinCenterIndex, r1, r0);
  }

  // Top cap (apex): fan from apexCenterIndex. CCW seen from above means
  // seg -> seg+1 -> center.
  for (let seg = 0; seg < ringSegments; seg++) {
    const r0 = ringVertexIndex(totalRows - 1, seg);
    const r1 = ringVertexIndex(totalRows - 1, seg + 1);
    indices.push(r0, r1, apexCenterIndex);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};
