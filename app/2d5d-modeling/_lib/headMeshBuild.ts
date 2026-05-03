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

  // Sample evenly between yMin and yMax. The poles (apex / chin) are now
  // ordinary rings rather than collapsed-to-a-point caps, so we use the
  // standard Catmull-Rom clamp (mirrorEnds=false) — the head tapers naturally
  // by whatever halfX / zFront / zBack values the user picked at the poles.
  type Row = { y: number; halfX: number; zFront: number; zBack: number };
  const rows: Row[] = [];
  for (let row = 0; row < LATITUDE_DENSITY; row++) {
    const u = row / (LATITUDE_DENSITY - 1);
    const y = yMin + (yMax - yMin) * u;
    rows.push({
      y,
      halfX: sampleCatmullRom1D(halfXSamples, y, catmullRomTension, false),
      zFront: sampleCatmullRom1D(zFrontSamples, y, catmullRomTension, false),
      zBack: sampleCatmullRom1D(zBackSamples, y, catmullRomTension, false),
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

  // Center cap vertices for chin (front of array) and apex (back). Position
  // is at the elliptical center of the corresponding pole ring so the cap is
  // flush with the ring rather than pulled toward the world Y axis.
  const chinRow = rows[0];
  const apexRow = rows[totalRows - 1];
  const chinCenterIndex = totalRows * ringStride;
  positions.push(0, chinRow.y, (chinRow.zFront + chinRow.zBack) * 0.5);
  const apexCenterIndex = chinCenterIndex + 1;
  positions.push(0, apexRow.y, (apexRow.zFront + apexRow.zBack) * 0.5);

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
