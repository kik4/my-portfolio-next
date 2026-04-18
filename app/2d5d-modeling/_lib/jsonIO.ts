import type {
  FaceModel,
  FeaturePolygon,
  InterpolationMode,
  Polygon,
} from "./types";

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
  // Basic validation
  if (!data.polygons || !Array.isArray(data.polygons)) {
    throw new Error("Invalid FaceModel: missing polygons array");
  }
  const polygons: Polygon[] = data.polygons.map((raw: unknown): Polygon => {
    const p = raw as Polygon;
    if (p.group !== "feature") return p;
    const feature = p as FeaturePolygon & { strokeRanges?: unknown };
    if (!("strokeRanges" in feature) || feature.strokeRanges === undefined) {
      return { ...(feature as FeaturePolygon), strokeRanges: null };
    }
    if (feature.strokeRanges === null) return feature as FeaturePolygon;
    const list = feature.strokeRanges as {
      id?: string;
      start: number;
      end: number;
    }[];
    const ranges = list.map((r, i) => ({
      id: r.id ?? `sr_${Date.now().toString(36)}_${i}`,
      start: r.start,
      end: r.end,
    }));
    return { ...(feature as FeaturePolygon), strokeRanges: ranges };
  });
  const interpolationMode: InterpolationMode = VALID_MODES.includes(
    data.interpolationMode,
  )
    ? data.interpolationMode
    : "rbf-gaussian";
  return {
    polygons,
    featureGroups: data.featureGroups ?? [],
    blendShapeWeights: data.blendShapeWeights ?? {},
    outlineFillColor: data.outlineFillColor ?? [0.99, 0.88, 0.78, 1],
    outlineStroke: data.outlineStroke ?? null,
    interpolationMode,
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
