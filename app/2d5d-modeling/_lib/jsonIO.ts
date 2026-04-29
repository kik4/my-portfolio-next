import { buildPresetHeadModel } from "./presetHeadCage";
import type { FaceModel, InterpolationMode } from "./types";

const VALID_MODES: InterpolationMode[] = [
  "rbf-gaussian",
  "rbf-gaussian-regularized",
  "linear-delaunay",
];

export function exportFaceModel(model: FaceModel): string {
  return JSON.stringify(model, null, 2);
}

export function importFaceModel(json: string): FaceModel {
  const data = JSON.parse(json);
  if (!data.head?.controlMesh) {
    throw new Error("Invalid FaceModel: missing head.controlMesh");
  }
  const interpolationMode: InterpolationMode = VALID_MODES.includes(
    data.interpolationMode,
  )
    ? data.interpolationMode
    : "rbf-gaussian";
  return {
    head: {
      controlMesh: data.head.controlMesh,
      subdivisionLevel: data.head.subdivisionLevel ?? 2,
    },
    headFillColor: data.headFillColor ?? [0.99, 0.88, 0.78, 1],
    parts: Array.isArray(data.parts) ? data.parts : [],
    groups: Array.isArray(data.groups) ? data.groups : [],
    blendShapeWeights: data.blendShapeWeights ?? {},
    interpolationMode,
  };
}

export function buildDefaultFaceModel(): FaceModel {
  return {
    head: buildPresetHeadModel(2),
    headFillColor: [0.99, 0.88, 0.78, 1],
    parts: [],
    groups: [],
    blendShapeWeights: {},
    interpolationMode: "rbf-gaussian",
  };
}

export function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
