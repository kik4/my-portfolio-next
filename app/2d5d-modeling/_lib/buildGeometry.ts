import polygonClipping from "polygon-clipping";
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
import type { ColorRGBA, FaceModel, Point2D, YawPitch } from "./types";
import { MAT2_IDENTITY } from "./types";

const SUBDIVISION_SEGMENTS = 8;
const LAYER_Z_STEP = 0.001;
const STROKE_Z_OFFSET = 0.0005; // slightly in front of fill

export interface StrokeLine {
  points: Point2D[];
  color: ColorRGBA;
  width: number;
  z: number;
}

export interface FaceGeometryResult {
  fillGeometry: THREE.BufferGeometry;
  strokes: StrokeLine[];
}

export function buildFaceGeometry(
  model: FaceModel,
  angle: YawPitch,
): FaceGeometryResult {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;
  const strokes: StrokeLine[] = [];
  const { blendShapeWeights, featureGroups, outlineFillColor, outlineStroke } =
    model;

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

  // Collect outline subdivided shapes for merged stroke
  const outlineSubdivided: { points: Point2D[]; z: number }[] = [];

  for (const polygon of sorted) {
    let points = polygon.basePoints;
    let alpha = 1;
    let effectiveLayerIndex = polygon.layerIndex;

    if (polygon.group === "outline") {
      points = interpolateOutlinePoints(polygon, angle, blendShapeWeights);
    } else if (polygon.group === "feature") {
      if (polygon.groupId) {
        const gt = groupTransforms.get(polygon.groupId);
        if (gt && !gt.visible) continue;
      }

      const result = interpolateFeature(polygon, angle, blendShapeWeights);
      let localPos = result.position;
      let localMat = result.matrix;

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
          effectiveLayerIndex = gt.layerIndex + polygon.layerIndex;
        }
      }

      points = result.blendedPoints.map(([x, y]) => [
        localMat[0] * x + localMat[1] * y + localPos[0],
        localMat[2] * x + localMat[3] * y + localPos[1],
      ]);
      alpha = result.alpha;
    }

    if (alpha <= 0) continue;

    const subdivided = subdivideClosed(points, SUBDIVISION_SEGMENTS);
    const z = effectiveLayerIndex * LAYER_Z_STEP;

    // Fill
    const fillColor =
      polygon.group === "outline" ? outlineFillColor : polygon.fillColor;
    const fillEnabled =
      polygon.group === "outline" ? true : polygon.fillEnabled;
    if (fillEnabled) {
      const tris = triangulate(subdivided);
      const [r, g, b] = fillColor;
      for (const [x, y] of subdivided) {
        positions.push(x, y, z);
        colors.push(r * alpha, g * alpha, b * alpha);
      }
      for (const idx of tris) {
        indices.push(idx + vertexOffset);
      }
      vertexOffset += subdivided.length;
    }

    if (polygon.group === "outline") {
      // Collect for merged outline stroke
      outlineSubdivided.push({ points: subdivided, z: z + STROKE_Z_OFFSET });
    } else if (polygon.strokeColor) {
      // Feature polygons: individual stroke
      strokes.push({
        points: subdivided,
        color: [
          polygon.strokeColor[0] * alpha,
          polygon.strokeColor[1] * alpha,
          polygon.strokeColor[2] * alpha,
          polygon.strokeColor[3],
        ],
        width: polygon.strokeWidth,
        z: z + STROKE_Z_OFFSET,
      });
    }
  }

  // Merged outline stroke using polygon union
  if (outlineStroke && outlineSubdivided.length > 0) {
    const maxZ = Math.max(...outlineSubdivided.map((o) => o.z));
    const clipPolygons: [number, number][][][] = outlineSubdivided.map((o) => [
      o.points.map(([x, y]) => [x, y] as [number, number]),
    ]);

    try {
      let merged = [clipPolygons[0]];
      for (let i = 1; i < clipPolygons.length; i++) {
        merged = polygonClipping.union(merged, [clipPolygons[i]]);
      }
      for (const poly of merged) {
        for (const ring of poly) {
          const pts: Point2D[] = ring.map(([x, y]) => [x, y]);
          // Remove duplicate closing point if present
          if (
            pts.length > 1 &&
            pts[0][0] === pts[pts.length - 1][0] &&
            pts[0][1] === pts[pts.length - 1][1]
          ) {
            pts.pop();
          }
          strokes.push({
            points: pts,
            color: outlineStroke.color,
            width: outlineStroke.width,
            z: maxZ,
          });
        }
      }
    } catch {
      // Fallback: draw individual strokes
      for (const o of outlineSubdivided) {
        strokes.push({
          points: o.points,
          color: outlineStroke.color,
          width: outlineStroke.width,
          z: o.z,
        });
      }
    }
  }

  const fillGeometry = new THREE.BufferGeometry();
  fillGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  fillGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3),
  );
  fillGeometry.setIndex(indices);
  fillGeometry.computeBoundingSphere();

  return { fillGeometry, strokes };
}
