import type { FaceModel } from "./types";

export function exportFaceModel(model: FaceModel): string {
  return JSON.stringify(model, null, 2);
}

export function importFaceModel(json: string): FaceModel {
  const data = JSON.parse(json);
  // Basic validation
  if (!data.polygons || !Array.isArray(data.polygons)) {
    throw new Error("Invalid FaceModel: missing polygons array");
  }
  return {
    polygons: data.polygons,
    featureGroups: data.featureGroups ?? [],
    blendShapeWeights: data.blendShapeWeights ?? {},
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
