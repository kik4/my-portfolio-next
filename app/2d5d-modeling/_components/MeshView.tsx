/** biome-ignore-all lint/suspicious/noArrayIndexKey: mesh element order is the identity */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: r3f three.js objects, not DOM */
"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Mesh as MeshData } from "../_lib/types";

interface Props {
  mesh: MeshData;
  fillColor: string;
  strokeColor: string;
  showWireframe?: boolean;
  showNormals?: boolean;
  showWinding?: boolean;
  // Selected element within this mesh. Highlight only.
  selected?:
    | { kind: "points"; indices: number[] }
    | { kind: "edge"; index: number }
    | { kind: "face"; index: number }
    | null;
  // Per-point click. Receives the modifier keys so the caller can extend
  // a multi-point selection on Shift+click.
  onPointClick?: (
    index: number,
    mods: { shift: boolean },
    event: { stopPropagation: () => void },
  ) => void;
  // Per-edge click for selection. Selecting an edge clears any point/face selection.
  onEdgeClick?: (index: number, event: { stopPropagation: () => void }) => void;
  // Per-face click for selection. Selecting a face clears any point/edge selection.
  onFaceClick?: (index: number, event: { stopPropagation: () => void }) => void;
  pointSize?: number;
}

export const MeshView = ({
  mesh,
  fillColor,
  strokeColor,
  showWireframe = false,
  showNormals = false,
  showWinding = false,
  selected = null,
  onPointClick,
  onEdgeClick,
  onFaceClick,
  pointSize = 0.04,
}: Props) => {
  const selectedPointSet = useMemo(
    () =>
      selected?.kind === "points"
        ? new Set(selected.indices)
        : new Set<number>(),
    [selected],
  );
  const faceGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(mesh.faces.length * 9);
    for (let i = 0; i < mesh.faces.length; i++) {
      const [a, b, c] = mesh.faces[i];
      const pa = mesh.points[a];
      const pb = mesh.points[b];
      const pc = mesh.points[c];
      positions.set([...pa, ...pb, ...pc], i * 9);
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.computeVertexNormals();
    return g;
  }, [mesh]);

  const edgeGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(mesh.edges.length * 6);
    for (let i = 0; i < mesh.edges.length; i++) {
      const [a, b] = mesh.edges[i];
      const pa = mesh.points[a];
      const pb = mesh.points[b];
      positions.set([...pa, ...pb], i * 6);
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [mesh]);

  const wireGeom = useMemo(() => {
    if (!showWireframe) return null;
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(mesh.faces.length * 18);
    for (let i = 0; i < mesh.faces.length; i++) {
      const [a, b, c] = mesh.faces[i];
      const pa = mesh.points[a];
      const pb = mesh.points[b];
      const pc = mesh.points[c];
      positions.set([...pa, ...pb, ...pb, ...pc, ...pc, ...pa], i * 18);
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [mesh, showWireframe]);

  const normalArrows = useMemo(() => {
    if (!showNormals) return [];
    return mesh.faces.map((face) => {
      const [a, b, c] = face;
      const pa = new THREE.Vector3(...mesh.points[a]);
      const pb = new THREE.Vector3(...mesh.points[b]);
      const pc = new THREE.Vector3(...mesh.points[c]);
      const center = pa.clone().add(pb).add(pc).divideScalar(3);
      const normal = pb.clone().sub(pa).cross(pc.clone().sub(pa)).normalize();
      return { center, normal };
    });
  }, [mesh, showNormals]);

  const selectedEdgeGeom = useMemo(() => {
    if (selected?.kind !== "edge") return null;
    const e = mesh.edges[selected.index];
    if (!e) return null;
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array([
      ...mesh.points[e[0]],
      ...mesh.points[e[1]],
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [mesh, selected]);

  const selectedFaceGeom = useMemo(() => {
    if (selected?.kind !== "face") return null;
    const f = mesh.faces[selected.index];
    if (!f) return null;
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array([
      ...mesh.points[f[0]],
      ...mesh.points[f[1]],
      ...mesh.points[f[2]],
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [mesh, selected]);

  return (
    <>
      {showWinding ? (
        <mesh geometry={faceGeom}>
          <meshBasicMaterial color="#88aaff" side={THREE.FrontSide} />
        </mesh>
      ) : (
        <mesh geometry={faceGeom}>
          <meshBasicMaterial color={fillColor} side={THREE.DoubleSide} />
        </mesh>
      )}
      {showWinding && (
        <mesh geometry={faceGeom}>
          <meshBasicMaterial color="#ff8888" side={THREE.BackSide} />
        </mesh>
      )}

      {selectedFaceGeom && (
        <mesh geometry={selectedFaceGeom}>
          <meshBasicMaterial
            color="#ffaa00"
            side={THREE.DoubleSide}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      <lineSegments geometry={edgeGeom}>
        <lineBasicMaterial color={strokeColor} />
      </lineSegments>

      {selectedEdgeGeom && (
        <lineSegments geometry={selectedEdgeGeom}>
          <lineBasicMaterial color="#ffaa00" linewidth={2} />
        </lineSegments>
      )}

      {/* Invisible thicker proxies along each edge for clickable picking. */}
      {onEdgeClick &&
        mesh.edges.map((e, i) => {
          const a = new THREE.Vector3(...mesh.points[e[0]]);
          const b = new THREE.Vector3(...mesh.points[e[1]]);
          const center = a.clone().add(b).multiplyScalar(0.5);
          const dir = b.clone().sub(a);
          const len = dir.length();
          const quat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.clone().normalize(),
          );
          return (
            <mesh
              key={i}
              position={center}
              quaternion={quat}
              onClick={(ev) => {
                ev.stopPropagation();
                onEdgeClick(i, ev);
              }}
              visible={false}
            >
              <cylinderGeometry args={[0.02, 0.02, len, 6]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          );
        })}

      {/* Invisible per-face pickers for face selection. */}
      {onFaceClick &&
        mesh.faces.map((f, i) => {
          const fg = new THREE.BufferGeometry();
          fg.setAttribute(
            "position",
            new THREE.BufferAttribute(
              new Float32Array([
                ...mesh.points[f[0]],
                ...mesh.points[f[1]],
                ...mesh.points[f[2]],
              ]),
              3,
            ),
          );
          return (
            <mesh
              key={i}
              geometry={fg}
              onClick={(ev) => {
                ev.stopPropagation();
                onFaceClick(i, ev);
              }}
              visible={false}
            >
              <meshBasicMaterial
                transparent
                opacity={0}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}

      {wireGeom && (
        <lineSegments geometry={wireGeom}>
          <lineBasicMaterial color="#666666" transparent opacity={0.4} />
        </lineSegments>
      )}

      {normalArrows.map((arrow, i) => (
        <arrowHelper
          key={i}
          args={[arrow.normal, arrow.center, 0.15, 0x00aa00, 0.05, 0.03]}
        />
      ))}

      {/* Point handles. Always rendered last so they sit on top. */}
      {mesh.points.map((p, i) => {
        const isSelected = selectedPointSet.has(i);
        return (
          <mesh
            key={i}
            position={p}
            onClick={(e) => {
              e.stopPropagation();
              onPointClick?.(i, { shift: e.shiftKey }, e);
            }}
          >
            <sphereGeometry args={[pointSize, 12, 8]} />
            <meshBasicMaterial color={isSelected ? "#ff3300" : "#0066ff"} />
          </mesh>
        );
      })}
    </>
  );
};
