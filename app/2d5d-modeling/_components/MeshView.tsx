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
}

export const MeshView = ({
  mesh,
  fillColor,
  strokeColor,
  showWireframe = false,
  showNormals = false,
  showWinding = false,
}: Props) => {
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

      <lineSegments geometry={edgeGeom}>
        <lineBasicMaterial color={strokeColor} />
      </lineSegments>

      {wireGeom && (
        <lineSegments geometry={wireGeom}>
          <lineBasicMaterial color="#666666" transparent opacity={0.4} />
        </lineSegments>
      )}

      {normalArrows.map((arrow, i) => (
        <arrowHelper
          // biome-ignore lint/suspicious/noArrayIndexKey: face count is stable
          key={i}
          args={[arrow.normal, arrow.center, 0.15, 0x00aa00, 0.05, 0.03]}
        />
      ))}
    </>
  );
};
