"use client";

import { useFrame, useThree } from "@react-three/fiber";
import earcut from "earcut";
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

const SIL_SEGMENTS_CAPACITY = 4096;
const FILL_VERTICES_CAPACITY = 4096;
const FILL_INDICES_CAPACITY = 12288;

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

  // Pre-allocated buffers for the silhouette line strip and the earcut fill
  // mesh. Both are rebuilt every frame from the current camera so they stay
  // in sync with the smoothed silhouette curve.
  const silhouetteGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(SIL_SEGMENTS_CAPACITY * 6), 3),
    );
    g.setDrawRange(0, 0);
    return g;
  }, []);

  const fillGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(FILL_VERTICES_CAPACITY * 3),
        3,
      ),
    );
    g.setIndex(
      new THREE.BufferAttribute(new Uint32Array(FILL_INDICES_CAPACITY), 1),
    );
    g.setDrawRange(0, 0);
    return g;
  }, []);

  useFrame(() => {
    const cameraPos: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    const { silhouetteEdges } = extractSilhouette(mesh, cameraPos);
    const loops = chainSilhouetteLoops(silhouetteEdges);

    // ---- Build smoothed (or raw) loops, recording both world-space points
    //      (for line + fill geometry) and NDC xy (for earcut input).
    const tmp = new THREE.Vector3();
    const builtLoops: { world: THREE.Vector3[]; ndc: Point2[] }[] = [];

    for (const loop of loops) {
      const isClosed = loop.length >= 2 && loop[0] === loop[loop.length - 1];
      const seq = isClosed ? loop.slice(0, -1) : loop;
      if (seq.length < 2) continue;

      const ndcPoints: { ndc: Point2; z: number }[] = [];
      for (const idx of seq) {
        const p = mesh.points[idx];
        tmp.set(p[0], p[1], p[2]).project(camera);
        ndcPoints.push({ ndc: [tmp.x, tmp.y], z: tmp.z });
      }

      let curve: { ndc: Point2; z: number }[];
      if (smoothSilhouette && ndcPoints.length >= 3) {
        const xy = ndcPoints.map((p) => p.ndc);
        const smoothed = smoothCatmullRom2D(xy, isClosed, smoothSamples);
        // Re-anchor each smoothed point's depth to the nearest segment of
        // the original ring. Adequate for the depth test; doesn't have to
        // be exact at sub-pixel scale.
        curve = smoothed.map((q) => {
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
          const za = ndcPoints[bestSeg].z;
          const zb = ndcPoints[(bestSeg + 1) % ndcPoints.length].z;
          return { ndc: q, z: za + (zb - za) * bestT };
        });
      } else {
        curve = ndcPoints.slice();
      }
      // Drop a duplicate trailing endpoint if the smoother emitted one for
      // a closed ring; both the line writer and earcut handle closure
      // implicitly via index arithmetic.
      if (
        curve.length >= 2 &&
        curve[0].ndc[0] === curve[curve.length - 1].ndc[0] &&
        curve[0].ndc[1] === curve[curve.length - 1].ndc[1]
      ) {
        curve.pop();
      }

      const world = curve.map((p) => {
        const v = new THREE.Vector3(p.ndc[0], p.ndc[1], p.z);
        v.unproject(camera);
        return v;
      });
      const ndc = curve.map((p) => p.ndc);
      builtLoops.push({ world, ndc });
    }

    // ---- Silhouette line buffer (closed strip per loop).
    const silAttr = silhouetteGeom.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const silBuf = silAttr.array as Float32Array;
    let silWritten = 0;
    if (showSilhouette) {
      for (const { world } of builtLoops) {
        for (let i = 0; i < world.length; i++) {
          if (silWritten >= SIL_SEGMENTS_CAPACITY) break;
          const a = world[i];
          const b = world[(i + 1) % world.length];
          silBuf.set([a.x, a.y, a.z, b.x, b.y, b.z], silWritten * 6);
          silWritten++;
        }
      }
    }
    silAttr.needsUpdate = true;
    silhouetteGeom.setDrawRange(0, silWritten * 2);

    // ---- Fill: earcut each loop in NDC space, emit world-space triangles.
    //      Loops are treated as independent outer rings — true holes are
    //      not detected here, but the icosahedron / typical convex meshes
    //      we expect at this stage produce a single ring per view.
    const fillPosAttr = fillGeom.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const fillIdxAttr = fillGeom.getIndex() as THREE.BufferAttribute;
    const fillPos = fillPosAttr.array as Float32Array;
    const fillIdx = fillIdxAttr.array as Uint32Array;
    let vCount = 0;
    let iCount = 0;
    for (const { world, ndc } of builtLoops) {
      if (world.length < 3) continue;
      const flat: number[] = [];
      for (const p of ndc) flat.push(p[0], p[1]);
      const tri = earcut(flat);
      if (tri.length === 0) continue;
      const baseV = vCount;
      for (const w of world) {
        if (vCount >= FILL_VERTICES_CAPACITY) break;
        fillPos[vCount * 3] = w.x;
        fillPos[vCount * 3 + 1] = w.y;
        fillPos[vCount * 3 + 2] = w.z;
        vCount++;
      }
      for (const ti of tri) {
        if (iCount >= FILL_INDICES_CAPACITY) break;
        fillIdx[iCount++] = baseV + ti;
      }
    }
    fillPosAttr.needsUpdate = true;
    fillIdxAttr.needsUpdate = true;
    fillGeom.setDrawRange(0, iCount);
  });

  return (
    <>
      {/* Fill pass. Always renders so the depth buffer has the silhouette
          surface in it — that's what occludes back-side lines. colorWrite
          is toggled by showFill so the user can hide colour but keep the
          occlusion. polygonOffset nudges the fill back so coplanar lines
          pass the depth test on top. */}
      <mesh geometry={fillGeom} renderOrder={0}>
        <meshBasicMaterial
          color={fillColor}
          colorWrite={showFill}
          side={THREE.DoubleSide}
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
