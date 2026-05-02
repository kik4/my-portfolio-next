import * as THREE from "three";
import { type CatmullRomSample, sampleCatmullRom1D } from "./catmullRom";
import type { HeadMesh } from "./types";

// Number of latitude rings between the apex and the chin used for the actual
// rendered geometry. The user-edited ySamples are control points; we sample
// the spline at this many positions to make a smooth surface.
const LATITUDE_DENSITY = 40;

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

  // Sample evenly between yMin and yMax. mirrorEnds=true tells the spline to
  // pretend the controls extend symmetrically past each pole (phantom value
  // = -inner-neighbour), which makes the radius approach zero with a steeper
  // tangent than the default clamp. Visually that's the difference between a
  // sharp cone tip and a rounded dome.
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

  // Vertex layout: a single pole vertex at the chin (index 0), then
  // ringStride vertices per intermediate ring, then a single pole vertex at
  // the apex. Collapsing each pole to one vertex is what gives smooth shading
  // there — duplicating ringSegments+1 coincident vertices fools
  // computeVertexNormals into giving each duplicate only the normal of its
  // neighboring face, producing the dimpled look around the pole.
  const ringStride = ringSegments + 1;
  // Chin pole vertex (index 0).
  positions.push(0, rows[0].y, 0);
  // Intermediate rings (rows 1..totalRows-2): full ringStride vertices each.
  for (let row = 1; row < totalRows - 1; row++) {
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
  }
  // Apex pole vertex (last index).
  const apexIndex = 1 + (totalRows - 2) * ringStride;
  positions.push(0, rows[totalRows - 1].y, 0);

  // Helper to map (interior row, seg) → flat vertex index.
  // interiorRow runs 1..totalRows-2 (inclusive). seg runs 0..ringSegments.
  const ringVertexIndex = (interiorRow: number, seg: number) =>
    1 + (interiorRow - 1) * ringStride + seg;

  // Bottom fan: chin pole → first interior ring.
  // Ordering: pole, seg, seg+1 — verified CCW by checking the outline hull
  // doesn't occlude the FrontSide fill.
  for (let seg = 0; seg < ringSegments; seg++) {
    const r0 = ringVertexIndex(1, seg);
    const r1 = ringVertexIndex(1, seg + 1);
    indices.push(0, r1, r0);
  }

  // Stitch adjacent interior rings into quads (two triangles each).
  // row+1 is higher up the head. Outward-CCW ordering is a0 -> a1 -> b1 -> b0.
  for (let row = 1; row < totalRows - 2; row++) {
    for (let seg = 0; seg < ringSegments; seg++) {
      const a0 = ringVertexIndex(row, seg);
      const a1 = ringVertexIndex(row, seg + 1);
      const b0 = ringVertexIndex(row + 1, seg);
      const b1 = ringVertexIndex(row + 1, seg + 1);
      indices.push(a0, a1, b1);
      indices.push(a0, b1, b0);
    }
  }

  // Top fan: last interior ring → apex pole.
  for (let seg = 0; seg < ringSegments; seg++) {
    const r0 = ringVertexIndex(totalRows - 2, seg);
    const r1 = ringVertexIndex(totalRows - 2, seg + 1);
    indices.push(r0, r1, apexIndex);
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
