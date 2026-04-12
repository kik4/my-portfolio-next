"use client";

import { Billboard } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { buildFaceGeometry } from "../_lib/buildGeometry";
import type { FaceModel, YawPitch } from "../_lib/types";

interface FaceMeshProps {
  model: FaceModel;
  angle: YawPitch;
  selectedPolygonId?: string;
}

export function FaceMesh({ model, angle, selectedPolygonId }: FaceMeshProps) {
  const { size } = useThree();
  const { fillGeometry, strokes, selectedOutlineStroke } = useMemo(
    () => buildFaceGeometry(model, angle, selectedPolygonId),
    [model, angle, selectedPolygonId],
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

  const strokeData = useMemo(() => {
    return strokes.map((stroke) => {
      const pts = stroke.points;
      // Line2 requires closed loop: append first point
      const posArr: number[] = [];
      for (let i = 0; i <= pts.length; i++) {
        const p = pts[i % pts.length];
        posArr.push(p[0], p[1], stroke.z);
      }

      const geo = new LineGeometry();
      geo.setPositions(posArr);

      const mat = new LineMaterial({
        color: new THREE.Color(
          stroke.color[0],
          stroke.color[1],
          stroke.color[2],
        ).getHex(),
        linewidth: stroke.width,
        toneMapped: false,
        resolution: new THREE.Vector2(size.width, size.height),
      });

      return { line: new Line2(geo, mat) };
    });
  }, [strokes, size.width, size.height]);

  const selectionLine = useMemo(() => {
    if (!selectedOutlineStroke) return null;
    const pts = selectedOutlineStroke.points;
    const posArr: number[] = [];
    for (let i = 0; i <= pts.length; i++) {
      const p = pts[i % pts.length];
      posArr.push(p[0], p[1], selectedOutlineStroke.z);
    }
    const geo = new LineGeometry();
    geo.setPositions(posArr);
    const mat = new LineMaterial({
      color: 0x3b82f6,
      linewidth: 2,
      toneMapped: false,
      resolution: new THREE.Vector2(size.width, size.height),
    });
    return new Line2(geo, mat);
  }, [selectedOutlineStroke, size.width, size.height]);

  return (
    <Billboard>
      <mesh geometry={fillGeometry} material={fillMaterial} />
      {strokeData.map((s) => (
        <primitive key={`stroke-${s.line.id}`} object={s.line} />
      ))}
      {selectionLine && (
        <primitive key={`sel-${selectionLine.id}`} object={selectionLine} />
      )}
    </Billboard>
  );
}
