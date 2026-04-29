"use client";

import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { buildFaceGeometry, type PartRenderItem } from "../_lib/buildGeometry";
import type { FaceModel, YawPitch } from "../_lib/types";

interface FaceMeshProps {
  model: FaceModel;
  angle: YawPitch;
}

function buildStrokeLine(
  item: PartRenderItem,
  resolution: THREE.Vector2,
): Line2 | null {
  if (!item.strokePoints2D || !item.strokeColor) return null;
  const pts = item.strokePoints2D;
  const positions: number[] = [];
  for (let i = 0; i <= pts.length; i++) {
    const p = pts[i % pts.length];
    positions.push(p[0], p[1], 0);
  }
  const geo = new LineGeometry();
  geo.setPositions(positions);
  const color = new THREE.Color(
    item.strokeColor[0] * item.alpha,
    item.strokeColor[1] * item.alpha,
    item.strokeColor[2] * item.alpha,
  );
  const mat = new LineMaterial({
    color: color.getHex(),
    linewidth: item.strokeWidth,
    toneMapped: false,
    resolution,
  });
  return new Line2(geo, mat);
}

export function FaceMesh({ model, angle }: FaceMeshProps) {
  const { size } = useThree();

  const built = useMemo(() => buildFaceGeometry(model, angle), [model, angle]);

  const headMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(
          model.headFillColor[0],
          model.headFillColor[1],
          model.headFillColor[2],
        ),
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [model.headFillColor],
  );

  const partMeshes = useMemo(() => {
    return built.parts.map((item) => {
      const transparent = item.alpha < 1;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(
          item.fillColor[0],
          item.fillColor[1],
          item.fillColor[2],
        ),
        side: THREE.DoubleSide,
        transparent,
        opacity: item.alpha,
        depthWrite: !transparent,
        toneMapped: false,
      });
      const resolution = new THREE.Vector2(size.width, size.height);
      const line = buildStrokeLine(item, resolution);
      return { item, material: mat, line };
    });
  }, [built.parts, size.width, size.height]);

  return (
    <>
      <mesh geometry={built.headGeometry} material={headMaterial} />
      {partMeshes.map(({ item, material, line }, idx) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: stable per build
          key={idx}
          position={item.position}
          quaternion={item.quaternion}
        >
          {item.fillEnabled && (
            <mesh geometry={item.geometry} material={material} />
          )}
          {line && <primitive object={line} />}
        </group>
      ))}
    </>
  );
}
