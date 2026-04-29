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
        // Front-only so the BackSide outline mesh isn't hidden by a back-facing
        // copy of the fill. The head is closed, so we don't need DoubleSide.
        side: THREE.FrontSide,
        toneMapped: false,
      }),
    [model.headFillColor],
  );

  // Backface-hull outline. The vertex is projected first, then expanded in
  // clip space along the screen-space normal. Doing it after projection keeps
  // the outline thickness uniform regardless of camera distance and -- most
  // importantly -- lets us preserve the original z so the depth test still
  // hides the outline behind the front-facing fill, leaving only the
  // silhouette visible. We use the outward direction from the head center
  // since the subdivided mesh's vertex normals are unreliable at the poles.
  const outlineMaterial = useMemo(() => {
    const { color, thickness } = model.headOutline;
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: {
          value: new THREE.Color(color[0], color[1], color[2]),
        },
        // Treat thickness as a screen-space fraction (~ NDC). 0.005 reads as
        // a thin line on a 1-unit head with the default camera.
        uThickness: { value: thickness },
      },
      vertexShader: `
        uniform float uThickness;
        void main() {
          vec3 outward = length(position) > 0.00001
            ? normalize(position)
            : normal;
          vec4 baseClip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec4 outClip = projectionMatrix * modelViewMatrix * vec4(position + outward, 1.0);
          // Screen-space direction from the base vertex toward the outward push.
          vec2 dir = (outClip.xy / outClip.w) - (baseClip.xy / baseClip.w);
          if (length(dir) > 0.00001) dir = normalize(dir);
          baseClip.xy += dir * uThickness * baseClip.w;
          gl_Position = baseClip;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4(uColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      toneMapped: false,
    });
  }, [model.headOutline]);

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
      {model.headOutline.enabled && (
        <mesh geometry={built.headGeometry} material={outlineMaterial} />
      )}
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
