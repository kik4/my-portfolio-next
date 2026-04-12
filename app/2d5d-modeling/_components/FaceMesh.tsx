"use client";

import { Billboard } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { buildFaceGeometry } from "../_lib/buildGeometry";
import type { FaceModel, YawPitch } from "../_lib/types";

interface FaceMeshProps {
  model: FaceModel;
  angle: YawPitch;
  opacity: number;
}

export function FaceMesh({ model, angle, opacity }: FaceMeshProps) {
  const { fillGeometry, strokes } = useMemo(
    () => buildFaceGeometry(model, angle),
    [model, angle],
  );

  const fillMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    fillMaterial.opacity = opacity;
    fillMaterial.transparent = opacity < 1;
    fillMaterial.depthWrite = opacity >= 1;
    fillMaterial.needsUpdate = true;
  }, [fillMaterial, opacity]);

  const strokeData = useMemo(() => {
    return strokes.map((stroke) => {
      const geo = new THREE.BufferGeometry();
      const pts = stroke.points;
      const positions = new Float32Array(pts.length * 3);
      for (let i = 0; i < pts.length; i++) {
        positions[i * 3] = pts[i][0];
        positions[i * 3 + 1] = pts[i][1];
        positions[i * 3 + 2] = stroke.z;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(
          stroke.color[0],
          stroke.color[1],
          stroke.color[2],
        ),
        linewidth: stroke.width,
        toneMapped: false,
      });

      return { geometry: geo, material: mat };
    });
  }, [strokes]);

  return (
    <Billboard>
      <mesh geometry={fillGeometry} material={fillMaterial} />
      {strokeData.map((s) => (
        <primitive
          key={`stroke-${s.geometry.id}`}
          object={new THREE.LineLoop(s.geometry, s.material)}
        />
      ))}
    </Billboard>
  );
}
