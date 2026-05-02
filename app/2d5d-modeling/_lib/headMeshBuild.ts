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

  // Sample evenly between yMin and yMax.
  const yLines: number[] = [];
  for (let row = 0; row < LATITUDE_DENSITY; row++) {
    const u = row / (LATITUDE_DENSITY - 1);
    yLines.push(yMin + (yMax - yMin) * u);
  }

  const positions: number[] = [];
  const indices: number[] = [];

  // Build rings. Each ring contributes ringSegments+1 vertices (we duplicate
  // the seam to keep the longitude index continuous; a closed-loop wrap would
  // be fine too but the duplicate keeps stitching code simple).
  for (let row = 0; row < LATITUDE_DENSITY; row++) {
    const y = yLines[row];
    const halfX = sampleCatmullRom1D(halfXSamples, y, catmullRomTension);
    const zFront = sampleCatmullRom1D(zFrontSamples, y, catmullRomTension);
    const zBack = sampleCatmullRom1D(zBackSamples, y, catmullRomTension);

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

  // Stitch adjacent rings into quads (two triangles each).
  // Vertex layout per quad: a0 = (row,   seg), a1 = (row,   seg+1),
  //                         b0 = (row+1, seg), b1 = (row+1, seg+1).
  // row indexes y from chin (yMin) at row=0 to apex (yMax) at row=LATITUDE_DENSITY-1,
  // so row+1 is *higher* on the head. Theta direction: x = a*sin(theta),
  // z(front) = +b*cos(theta), so at theta=0 the point is at +Z (front of face),
  // and as seg grows the point rotates toward +X (right side).
  // Empirically (verified by checking that the BackSide outline hull does not
  // occlude the FrontSide fill), the outward-CCW ordering is
  //   a0 -> a1 -> b1 -> b0
  // i.e. lower-left -> lower-right -> upper-right -> upper-left when viewed
  // from outside.
  const ringStride = ringSegments + 1;
  for (let row = 0; row < LATITUDE_DENSITY - 1; row++) {
    for (let seg = 0; seg < ringSegments; seg++) {
      const a0 = row * ringStride + seg;
      const a1 = row * ringStride + seg + 1;
      const b0 = (row + 1) * ringStride + seg;
      const b1 = (row + 1) * ringStride + seg + 1;
      indices.push(a0, a1, b1);
      indices.push(a0, b1, b0);
    }
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
