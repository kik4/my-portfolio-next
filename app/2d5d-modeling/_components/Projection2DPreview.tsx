"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { type Point2, smoothCatmullRom2D } from "../_lib/catmullRom2D";
import { chainSilhouetteLoops, extractSilhouette } from "../_lib/silhouette";
import type { Mesh as MeshData } from "../_lib/types";

interface Props {
  mesh: MeshData;
  strokeColor: string;
  fillColor: string;
  silhouetteColor?: string;
  showFill?: boolean;
  showExplicitEdges?: boolean;
  showSilhouette?: boolean;
  smoothSilhouette?: boolean;
  smoothSamples?: number;
}

const buildExplicitPositions = (mesh: MeshData): Float32Array => {
  const arr = new Float32Array(mesh.edges.length * 6);
  for (let i = 0; i < mesh.edges.length; i++) {
    const [a, b] = mesh.edges[i];
    const pa = mesh.points[a];
    const pb = mesh.points[b];
    arr.set([...pa, ...pb], i * 6);
  }
  return arr;
};

// Capacity for silhouette geometry (in segments). Smoothing inflates a
// small loop to many subsegments, so size generously.
const SIL_SEGMENTS_CAPACITY = 4096;

export const Projection2DPreview = ({
  mesh,
  strokeColor,
  fillColor,
  silhouetteColor = "#cc3300",
  showFill = true,
  showExplicitEdges = true,
  showSilhouette = true,
  smoothSilhouette = true,
  smoothSamples = 8,
}: Props) => {
  const { camera } = useThree();

  const explicitGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(buildExplicitPositions(mesh), 3),
    );
    return g;
  }, [mesh]);

  const depthGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(mesh.faces.length * 9);
    for (let i = 0; i < mesh.faces.length; i++) {
      const [a, b, c] = mesh.faces[i];
      positions.set(
        [...mesh.points[a], ...mesh.points[b], ...mesh.points[c]],
        i * 9,
      );
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [mesh]);

  const silhouetteGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const buf = new Float32Array(SIL_SEGMENTS_CAPACITY * 6);
    g.setAttribute("position", new THREE.BufferAttribute(buf, 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);

  useFrame(() => {
    if (!showSilhouette) return;
    const cameraPos: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    const { silhouetteEdges } = extractSilhouette(mesh, cameraPos);
    const loops = chainSilhouetteLoops(silhouetteEdges);

    const attr = silhouetteGeom.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const buf = attr.array as Float32Array;

    let written = 0;
    const writeSeg = (
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number,
    ) => {
      if (written >= SIL_SEGMENTS_CAPACITY) return;
      buf.set([ax, ay, az, bx, by, bz], written * 6);
      written++;
    };

    const ndcPoints: { ndc: Point2; z: number }[] = [];
    const tmp = new THREE.Vector3();

    for (const loop of loops) {
      // Project each loop point to NDC. Loops emitted by chainSilhouetteLoops
      // include the start at the end (closed); we treat closed=true and
      // exclude the duplicate before sampling to avoid a zero-length segment.
      const isClosed = loop.length >= 2 && loop[0] === loop[loop.length - 1];
      const seq = isClosed ? loop.slice(0, -1) : loop;
      ndcPoints.length = 0;
      for (const idx of seq) {
        const p = mesh.points[idx];
        tmp.set(p[0], p[1], p[2]).project(camera);
        ndcPoints.push({ ndc: [tmp.x, tmp.y], z: tmp.z });
      }

      let curve: { ndc: Point2; z: number }[];
      if (smoothSilhouette && ndcPoints.length >= 3) {
        const xy = ndcPoints.map((p) => p.ndc);
        const smoothed = smoothCatmullRom2D(xy, isClosed, smoothSamples);
        // Map each smoothed point back to a depth by piecewise-linear
        // interpolation along the original ring's arc length in NDC. Crude
        // but adequate — depth doesn't have to be exact for the depth test
        // to give sensible occlusion at sub-pixel scale.
        const ringZs = ndcPoints.map((p) => p.z);
        // Build cumulative arc lengths of the ORIGINAL polyline in NDC for
        // depth lookup. The smoothed curve's arc length isn't trivially
        // alignable; we re-anchor by nearest-segment instead.
        curve = smoothed.map((q) => {
          // Find which original segment q sits closest to — pick by minimum
          // distance to the segment, then interpolate z linearly along it.
          let bestSeg = 0;
          let bestT = 0;
          let bestD = Infinity;
          const segs = isClosed ? ndcPoints.length : ndcPoints.length - 1;
          for (let i = 0; i < segs; i++) {
            const a = ndcPoints[i].ndc;
            const b = ndcPoints[(i + 1) % ndcPoints.length].ndc;
            const vx = b[0] - a[0];
            const vy = b[1] - a[1];
            const wx = q[0] - a[0];
            const wy = q[1] - a[1];
            const denom = vx * vx + vy * vy;
            const t =
              denom > 0
                ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / denom))
                : 0;
            const px = a[0] + vx * t;
            const py = a[1] + vy * t;
            const dx = q[0] - px;
            const dy = q[1] - py;
            const d = dx * dx + dy * dy;
            if (d < bestD) {
              bestD = d;
              bestSeg = i;
              bestT = t;
            }
          }
          const za = ringZs[bestSeg];
          const zb = ringZs[(bestSeg + 1) % ringZs.length];
          return { ndc: q, z: za + (zb - za) * bestT };
        });
      } else {
        curve = ndcPoints.slice();
        if (isClosed && curve.length > 0) curve.push(curve[0]);
      }

      // Unproject NDC -> world and emit segments.
      const worldPts: THREE.Vector3[] = curve.map((p) => {
        const v = new THREE.Vector3(p.ndc[0], p.ndc[1], p.z);
        v.unproject(camera);
        return v;
      });
      for (let i = 0; i + 1 < worldPts.length; i++) {
        const wa = worldPts[i];
        const wb = worldPts[i + 1];
        writeSeg(wa.x, wa.y, wa.z, wb.x, wb.y, wb.z);
      }
      if (smoothSilhouette && isClosed && worldPts.length >= 1) {
        // Close the smoothed ring back to its first point.
        const wa = worldPts[worldPts.length - 1];
        const wb = worldPts[0];
        writeSeg(wa.x, wa.y, wa.z, wb.x, wb.y, wb.z);
      }
    }
    attr.needsUpdate = true;
    silhouetteGeom.setDrawRange(0, written * 2);
  });

  return (
    <>
      {/* Surface pass. When `showFill` is on, colour is written using the
          part's fillColor so the projected silhouette interior is opaque.
          When off, only depth is written so lines drawn after fail the
          depth test wherever the mesh occludes them. polygonOffset nudges
          the surface back so coplanar explicit edges still render on top.
          BackSide-only ensures we don't paint over interior detail when
          two layers of the mesh stack. */}
      <mesh geometry={depthGeom} renderOrder={0}>
        <meshBasicMaterial
          color={fillColor}
          colorWrite={showFill}
          side={THREE.FrontSide}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      {showExplicitEdges && (
        <lineSegments geometry={explicitGeom} renderOrder={1}>
          <lineBasicMaterial color={strokeColor} />
        </lineSegments>
      )}
      {showSilhouette && (
        <lineSegments geometry={silhouetteGeom} renderOrder={1}>
          <lineBasicMaterial color={silhouetteColor} linewidth={2} />
        </lineSegments>
      )}
    </>
  );
};
