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
  const { fillGeometry, transparentFills, strokes, selectedOutlineStroke } =
    useMemo(
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
      const posArr: number[] = [];
      if (stroke.closed) {
        // Close loop: append first point at end
        for (let i = 0; i <= pts.length; i++) {
          const p = pts[i % pts.length];
          posArr.push(p[0], p[1], stroke.z);
        }
      } else {
        for (const p of pts) {
          posArr.push(p[0], p[1], stroke.z);
        }
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

  const transparentMeshes = useMemo(
    () =>
      transparentFills.map((tf) => {
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(tf.color[0], tf.color[1], tf.color[2]),
          transparent: true,
          opacity: tf.alpha,
          side: THREE.DoubleSide,
          toneMapped: false,
          depthWrite: false,
        });
        return { geometry: tf.geometry, material: mat };
      }),
    [transparentFills],
  );

  return (
    <Billboard>
      <mesh geometry={fillGeometry} material={fillMaterial} />
      {transparentMeshes.map((tm) => (
        <mesh
          key={`tf-${tm.geometry.id}`}
          geometry={tm.geometry}
          material={tm.material}
        />
      ))}
      {strokeData.map((s) => (
        <primitive key={`stroke-${s.line.id}`} object={s.line} />
      ))}
      {selectionLine && (
        <primitive key={`sel-${selectionLine.id}`} object={selectionLine} />
      )}
    </Billboard>
  );
}
