import type {
  FaceModel,
  FeatureGroup,
  FeaturePolygon,
  InterpolationMode,
  Point2D,
  Polygon,
} from "./types";

const VALID_MODES: InterpolationMode[] = [
  "rbf-gaussian",
  "rbf-gaussian-regularized",
  "linear-delaunay",
];

// Ensure every point has the 3rd element (sharpness). Legacy JSON only stored
// [x, y]; pad with the given default.
function padPoints(raw: unknown, defaultS: number): Point2D[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((pt): Point2D => {
    const arr = pt as number[];
    return [arr[0], arr[1], arr[2] ?? defaultS];
  });
}

function padPosition(raw: unknown): Point2D {
  const arr = (raw as number[]) ?? [0, 0, 0];
  return [arr[0] ?? 0, arr[1] ?? 0, arr[2] ?? 0];
}

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
    const p = raw as Polygon & {
      basePoints: unknown;
      blendShapes?: { deltas: unknown; [k: string]: unknown }[];
      yawPitchKeyframes?: {
        deltas?: unknown;
        position?: unknown;
        [k: string]: unknown;
      }[];
    };
    const basePoints = padPoints(p.basePoints, 1);
    const blendShapes = (p.blendShapes ?? []).map((bs) => ({
      ...bs,
      deltas: padPoints(bs.deltas, 0),
    })) as Polygon["blendShapes"];
    const yawPitchKeyframes = (p.yawPitchKeyframes ?? []).map((kf) => {
      const patched: Record<string, unknown> = { ...kf };
      if ("deltas" in kf) patched.deltas = padPoints(kf.deltas, 0);
      if ("position" in kf) patched.position = padPosition(kf.position);
      return patched;
    });
    const patched = {
      ...p,
      basePoints,
      blendShapes,
      yawPitchKeyframes,
    } as unknown as Polygon;
    if (patched.group !== "feature") return patched;
    const feature = patched as FeaturePolygon & { strokeRanges?: unknown };
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
  const featureGroups: FeatureGroup[] = (
    (data.featureGroups ?? []) as (FeatureGroup & {
      yawPitchKeyframes: { position?: unknown }[];
    })[]
  ).map((g) => ({
    ...g,
    yawPitchKeyframes: g.yawPitchKeyframes.map((kf) => ({
      ...kf,
      position: padPosition(kf.position),
    })) as FeatureGroup["yawPitchKeyframes"],
  }));
  const interpolationMode: InterpolationMode = VALID_MODES.includes(
    data.interpolationMode,
  )
    ? data.interpolationMode
    : "rbf-gaussian";
  return {
    polygons,
    featureGroups,
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
