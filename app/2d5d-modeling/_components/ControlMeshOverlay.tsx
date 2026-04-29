"use client";

import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ControlMesh, ControlVertex, Vec3 } from "../_lib/types";

interface ControlMeshOverlayProps {
  mesh: ControlMesh;
  selectedVertexId: string | null;
  showWireframe: boolean;
  showVertices: boolean;
  symmetric: boolean;
  onSelectVertex: (id: string | null) => void;
  onMoveVertex: (id: string, newPos: Vec3) => void;
}

const VERTEX_RADIUS = 0.012;
const SELECTED_COLOR = new THREE.Color(0x3b82f6);
const NORMAL_COLOR = new THREE.Color(0x6b7280);
const MIDPLANE_COLOR = new THREE.Color(0xa855f7);

function buildWireframePositions(mesh: ControlMesh): Float32Array {
  const idIndex = new Map<string, ControlVertex>();
  for (const v of mesh.vertices) idIndex.set(v.id, v);
  const seen = new Set<string>();
  const segments: number[] = [];
  for (const f of mesh.faces) {
    const ids = f.vertexIds;
    for (let i = 0; i < ids.length; i++) {
      const a = ids[i];
      const b = ids[(i + 1) % ids.length];
      if (a === b) continue;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const va = idIndex.get(a);
      const vb = idIndex.get(b);
      if (!va || !vb) continue;
      segments.push(...va.position, ...vb.position);
    }
  }
  return new Float32Array(segments);
}

export function ControlMeshOverlay({
  mesh,
  selectedVertexId,
  showWireframe,
  showVertices,
  symmetric,
  onSelectVertex,
  onMoveVertex,
}: ControlMeshOverlayProps) {
  const { invalidate } = useThree();

  const wireGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(buildWireframePositions(mesh), 3),
    );
    return geo;
  }, [mesh]);

  const wireMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x9ca3af,
        toneMapped: false,
        transparent: true,
        opacity: 0.6,
      }),
    [],
  );

  // The proxy object whose position is driven by TransformControls.
  const proxyRef = useRef<THREE.Object3D | null>(null);
  const draggingRef = useRef(false);
  const selectedVertex = selectedVertexId
    ? mesh.vertices.find((v) => v.id === selectedVertexId)
    : undefined;

  // Sync proxy position with the selected vertex when not dragging.
  useEffect(() => {
    const obj = proxyRef.current;
    if (!obj) return;
    if (draggingRef.current) return;
    if (!selectedVertex) return;
    obj.position.set(
      selectedVertex.position[0],
      selectedVertex.position[1],
      selectedVertex.position[2],
    );
    invalidate();
  }, [selectedVertex, invalidate]);

  return (
    <>
      {showWireframe && (
        <lineSegments geometry={wireGeometry} material={wireMaterial} />
      )}
      {showVertices &&
        mesh.vertices.map((v) => {
          const selected = v.id === selectedVertexId;
          const color = selected
            ? SELECTED_COLOR
            : v.onMidplane
              ? MIDPLANE_COLOR
              : NORMAL_COLOR;
          return (
            <mesh
              key={v.id}
              position={v.position}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectVertex(v.id);
              }}
            >
              <sphereGeometry args={[VERTEX_RADIUS, 12, 8]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          );
        })}
      {selectedVertex && (
        <>
          <object3D
            ref={proxyRef}
            position={[
              selectedVertex.position[0],
              selectedVertex.position[1],
              selectedVertex.position[2],
            ]}
          />
          {proxyRef.current && (
            <TransformControls
              object={proxyRef.current}
              mode="translate"
              size={0.7}
              onMouseDown={() => {
                draggingRef.current = true;
              }}
              onMouseUp={() => {
                draggingRef.current = false;
              }}
              // The drei wrapper already disables makeDefault OrbitControls
              // while dragging; we just need to forward position changes.
              onChange={() => {
                if (!proxyRef.current || !selectedVertex) return;
                if (!draggingRef.current) return;
                const p = proxyRef.current.position;
                let pos: Vec3 = [p.x, p.y, p.z];
                if (symmetric && selectedVertex.onMidplane) {
                  pos = [0, p.y, p.z];
                  if (p.x !== 0) p.x = 0;
                }
                onMoveVertex(selectedVertex.id, pos);
              }}
            />
          )}
        </>
      )}
    </>
  );
}
