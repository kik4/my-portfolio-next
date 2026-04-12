import * as THREE from "three";
import { subdivideClosed } from "./catmullRom";
import {
  composeTransforms,
  interpolateGroupTransform,
  isGroupVisible,
  resolveGroupLayerIndex,
} from "./featureGroup";
import { interpolateFeature } from "./interpolateFeature";
import { interpolateOutlinePoints } from "./interpolateOutline";
import { triangulate } from "./triangulate";
import type { FaceModel, YawPitch } from "./types";
import { MAT2_IDENTITY } from "./types";

const SUBDIVISION_SEGMENTS = 8;
const LAYER_Z_STEP = 0.001;

export function buildFaceGeometry(
  model: FaceModel,
  angle: YawPitch,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;
  const { blendShapeWeights, featureGroups } = model;

  // Pre-compute group transforms, visibility, layerIndex
  const groupTransforms = new Map<
    string,
    {
      visible: boolean;
      position: [number, number];
      matrix: [number, number, number, number];
      layerIndex: number;
    }
  >();
  for (const g of featureGroups) {
    const visible = isGroupVisible(g, angle);
    if (!visible) {
      groupTransforms.set(g.id, {
        visible: false,
        position: [0, 0],
        matrix: MAT2_IDENTITY,
        layerIndex: g.baseLayerIndex,
      });
      continue;
    }
    const transform = interpolateGroupTransform(g, angle);
    const layerIndex = resolveGroupLayerIndex(g, angle);
    groupTransforms.set(g.id, {
      visible: true,
      ...transform,
      layerIndex,
    });
  }

  const sorted = [...model.polygons].sort(
    (a, b) => a.layerIndex - b.layerIndex,
  );

  for (const polygon of sorted) {
    let points = polygon.basePoints;
    let alpha = 1;
    let effectiveLayerIndex = polygon.layerIndex;

    if (polygon.group === "outline") {
      points = interpolateOutlinePoints(polygon, angle, blendShapeWeights);
    } else if (polygon.group === "feature") {
      // Check group visibility
      if (polygon.groupId) {
        const gt = groupTransforms.get(polygon.groupId);
        if (gt && !gt.visible) continue;
      }

      const result = interpolateFeature(polygon, angle, blendShapeWeights);
      let localPos = result.position;
      let localMat = result.matrix;

      // Compose with group transform
      if (polygon.groupId) {
        const gt = groupTransforms.get(polygon.groupId);
        if (gt?.visible) {
          const composed = composeTransforms(
            gt.position,
            gt.matrix,
            localPos,
            localMat,
          );
          localPos = composed.position;
          localMat = composed.matrix;
          // Add polygon layerIndex as offset to group layerIndex
          effectiveLayerIndex = gt.layerIndex + polygon.layerIndex;
        }
      }

      // Apply final transform to blended points
      points = result.blendedPoints.map(([x, y]) => [
        localMat[0] * x + localMat[1] * y + localPos[0],
        localMat[2] * x + localMat[3] * y + localPos[1],
      ]);
      alpha = result.alpha;
    }

    if (alpha <= 0) continue;

    const subdivided = subdivideClosed(points, SUBDIVISION_SEGMENTS);
    const tris = triangulate(subdivided);

    const z = effectiveLayerIndex * LAYER_Z_STEP;
    const [r, g, b] = polygon.fillColor;

    for (const [x, y] of subdivided) {
      positions.push(x, y, z);
      colors.push(r * alpha, g * alpha, b * alpha);
    }
    for (const idx of tris) {
      indices.push(idx + vertexOffset);
    }
    vertexOffset += subdivided.length;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
