"use client";

import { useCallback, useMemo, useState } from "react";
import { downloadJson, exportFaceModel, importFaceModel } from "../_lib/jsonIO";
import type {
  FaceModel,
  FeatureGroup,
  FeatureKeyframe,
  FeaturePolygon,
  OutlineKeyframe,
  OutlinePolygon,
  Point2D,
  Polygon,
  YawPitch,
} from "../_lib/types";
import { MAT2_IDENTITY } from "../_lib/types";
import { PointEditor } from "./PointEditor";
import { ReferenceScene } from "./ReferenceScene";
import { Scene } from "./Scene";

function createEllipsePoints(rx: number, ry: number, n: number): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    points.push([Math.sin(t) * rx, Math.cos(t) * ry]);
  }
  return points;
}

function createOutlinePolygon(id: string, layerIndex: number): OutlinePolygon {
  return {
    id,
    group: "outline",
    basePoints: createEllipsePoints(0.3, 0.4, 16),
    layerIndex,
    fillColor: [0.99, 0.88, 0.78, 1],
    yawPitchKeyframes: [],
    blendShapes: [],
  };
}

function createFeaturePolygon(id: string, layerIndex: number): FeaturePolygon {
  return {
    id,
    group: "feature",
    basePoints: createEllipsePoints(0.05, 0.03, 8),
    layerIndex,
    fillColor: [0.2, 0.2, 0.2, 1],
    baseAlpha: 1,
    yawPitchKeyframes: [],
    blendShapes: [],
  };
}

type EditMode =
  | { type: "base" }
  | { type: "keyframe"; index: number }
  | { type: "blendshape"; index: number };

function hexToRgba(hex: string): [number, number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1];
}

function rgbaToHex(c: [number, number, number, number]): string {
  const r = Math.round(c[0] * 255)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round(c[1] * 255)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round(c[2] * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
}

export function ModelingTool() {
  const [polygons, setPolygons] = useState<Polygon[]>(() => [
    createOutlinePolygon("faceOutline", 0),
  ]);
  const [selectedPolygonIndex, setSelectedPolygonIndex] = useState(0);
  const [editMode, setEditMode] = useState<EditMode>({ type: "base" });

  const [featureGroups, setFeatureGroups] = useState<FeatureGroup[]>([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(
    null,
  );
  const [blendShapeWeights, setBlendShapeWeights] = useState<
    Record<string, number>
  >({});

  const [referenceVisible, setReferenceVisible] = useState(true);
  const [referenceOpacity, setReferenceOpacity] = useState(0.5);
  const [faceOpacity, setFaceOpacity] = useState(1);
  const [angle, setAngle] = useState<YawPitch>({ yaw: 0, pitch: 0 });
  const [zoom, setZoom] = useState(600);

  const handleAngleChange = useCallback((yaw: number, pitch: number) => {
    setAngle({ yaw, pitch });
  }, []);
  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const selectedPolygon = polygons[selectedPolygonIndex];

  const updateSelectedPolygon = useCallback(
    (updater: (p: Polygon) => Polygon) => {
      setPolygons((prev) =>
        prev.map((p, i) => (i === selectedPolygonIndex ? updater(p) : p)),
      );
    },
    [selectedPolygonIndex],
  );

  const editorPoints = useMemo(() => {
    if (!selectedPolygon) return [];
    const { basePoints } = selectedPolygon;
    if (editMode.type === "base") return basePoints;
    if (editMode.type === "blendshape") {
      const bs = selectedPolygon.blendShapes[editMode.index];
      if (!bs) return basePoints;
      return basePoints.map(
        ([bx, by], i) =>
          [
            bx + (bs.deltas[i]?.[0] ?? 0),
            by + (bs.deltas[i]?.[1] ?? 0),
          ] as Point2D,
      );
    }
    if (selectedPolygon.group === "outline") {
      const kf = selectedPolygon.yawPitchKeyframes[editMode.index];
      if (!kf) return basePoints;
      return basePoints.map(
        ([bx, by], i) =>
          [
            bx + (kf.deltas[i]?.[0] ?? 0),
            by + (kf.deltas[i]?.[1] ?? 0),
          ] as Point2D,
      );
    }
    if (selectedPolygon.group === "feature") {
      const kf = selectedPolygon.yawPitchKeyframes[editMode.index];
      if (!kf) return basePoints;
      const [tx, ty] = kf.position;
      return basePoints.map(([bx, by]) => [bx + tx, by + ty] as Point2D);
    }
    return basePoints;
  }, [editMode, selectedPolygon]);

  const handleEditorChange = useCallback(
    (newPoints: Point2D[]) => {
      if (!selectedPolygon) return;
      if (editMode.type === "base") {
        updateSelectedPolygon((p) => ({ ...p, basePoints: newPoints }));
        return;
      }
      if (editMode.type === "blendshape") {
        const bsIndex = editMode.index;
        const deltas: Point2D[] = newPoints.map(([px, py], j) => [
          px - selectedPolygon.basePoints[j][0],
          py - selectedPolygon.basePoints[j][1],
        ]);
        if (selectedPolygon.group === "outline") {
          updateSelectedPolygon((p) => {
            if (p.group !== "outline") return p;
            return {
              ...p,
              blendShapes: p.blendShapes.map((bs, i) =>
                i === bsIndex ? { ...bs, deltas } : bs,
              ),
            };
          });
        } else {
          updateSelectedPolygon((p) => {
            if (p.group !== "feature") return p;
            return {
              ...p,
              blendShapes: p.blendShapes.map((bs, i) =>
                i === bsIndex ? { ...bs, deltas } : bs,
              ),
            };
          });
        }
        return;
      }
      if (selectedPolygon.group === "outline") {
        const kfIndex = editMode.index;
        updateSelectedPolygon((p) => {
          if (p.group !== "outline") return p;
          return {
            ...p,
            yawPitchKeyframes: p.yawPitchKeyframes.map((kf, i) => {
              if (i !== kfIndex) return kf;
              const deltas: Point2D[] = newPoints.map(([px, py], j) => [
                px - p.basePoints[j][0],
                py - p.basePoints[j][1],
              ]);
              return { ...kf, deltas };
            }),
          };
        });
      }
      if (selectedPolygon.group === "feature") {
        const kfIndex = editMode.index;
        const baseCenter: Point2D = [
          selectedPolygon.basePoints.reduce((s, p) => s + p[0], 0) /
            selectedPolygon.basePoints.length,
          selectedPolygon.basePoints.reduce((s, p) => s + p[1], 0) /
            selectedPolygon.basePoints.length,
        ];
        const newCenter: Point2D = [
          newPoints.reduce((s, p) => s + p[0], 0) / newPoints.length,
          newPoints.reduce((s, p) => s + p[1], 0) / newPoints.length,
        ];
        updateSelectedPolygon((p) => {
          if (p.group !== "feature") return p;
          return {
            ...p,
            yawPitchKeyframes: p.yawPitchKeyframes.map((kf, i) =>
              i !== kfIndex
                ? kf
                : {
                    ...kf,
                    position: [
                      newCenter[0] - baseCenter[0],
                      newCenter[1] - baseCenter[1],
                    ] as Point2D,
                  },
            ),
          };
        });
      }
    },
    [editMode, selectedPolygon, updateSelectedPolygon],
  );

  const addKeyframe = useCallback(() => {
    if (!selectedPolygon) return;
    if (selectedPolygon.group === "outline") {
      const deltas: Point2D[] = selectedPolygon.basePoints.map(() => [0, 0]);
      const newKf: OutlineKeyframe = {
        angle: { yaw: angle.yaw, pitch: angle.pitch },
        deltas,
      };
      updateSelectedPolygon((p) => {
        if (p.group !== "outline") return p;
        return { ...p, yawPitchKeyframes: [...p.yawPitchKeyframes, newKf] };
      });
    }
    if (selectedPolygon.group === "feature") {
      const newKf: FeatureKeyframe = {
        angle: { yaw: angle.yaw, pitch: angle.pitch },
        position: [0, 0],
        matrix: MAT2_IDENTITY,
        alpha: 1,
      };
      updateSelectedPolygon((p) => {
        if (p.group !== "feature") return p;
        return { ...p, yawPitchKeyframes: [...p.yawPitchKeyframes, newKf] };
      });
    }
    setEditMode({
      type: "keyframe",
      index: selectedPolygon.yawPitchKeyframes.length,
    });
  }, [angle, selectedPolygon, updateSelectedPolygon]);

  const deleteKeyframe = useCallback(
    (index: number) => {
      updateSelectedPolygon(
        (p) =>
          ({
            ...p,
            yawPitchKeyframes: (p.yawPitchKeyframes as unknown[]).filter(
              (_, i) => i !== index,
            ),
          }) as Polygon,
      );
      if (editMode.type === "keyframe") {
        if (editMode.index === index) setEditMode({ type: "base" });
        else if (editMode.index > index)
          setEditMode({ type: "keyframe", index: editMode.index - 1 });
      }
    },
    [editMode, updateSelectedPolygon],
  );

  const addPolygon = useCallback(
    (group: "outline" | "feature") => {
      const id = `${group}_${Date.now()}`;
      const maxLayer = polygons.reduce(
        (max, p) => Math.max(max, p.layerIndex),
        -1,
      );
      setPolygons((prev) => [
        ...prev,
        group === "outline"
          ? createOutlinePolygon(id, maxLayer + 1)
          : createFeaturePolygon(id, maxLayer + 1),
      ]);
      setSelectedPolygonIndex(polygons.length);
      setEditMode({ type: "base" });
    },
    [polygons],
  );

  const deletePolygon = useCallback(
    (index: number) => {
      if (polygons.length <= 1) return;
      setPolygons((prev) => prev.filter((_, i) => i !== index));
      if (selectedPolygonIndex === index) {
        setSelectedPolygonIndex(Math.max(0, index - 1));
        setEditMode({ type: "base" });
      } else if (selectedPolygonIndex > index)
        setSelectedPolygonIndex(selectedPolygonIndex - 1);
    },
    [polygons.length, selectedPolygonIndex],
  );

  const getKfAngleLabel = (kf: OutlineKeyframe | FeatureKeyframe) =>
    `(${kf.angle.yaw.toFixed(0)}°, ${kf.angle.pitch.toFixed(0)}°)`;

  const selectedFeatureKf =
    selectedPolygon?.group === "feature" && editMode.type === "keyframe"
      ? selectedPolygon.yawPitchKeyframes[editMode.index]
      : null;

  const allBlendShapeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of polygons) for (const bs of p.blendShapes) ids.add(bs.id);
    return [...ids];
  }, [polygons]);

  const selectedGroup =
    selectedGroupIndex !== null ? featureGroups[selectedGroupIndex] : null;

  const model: FaceModel = { polygons, featureGroups, blendShapeWeights };

  return (
    <div className="flex min-h-0 flex-1">
      {/* ===== LEFT PANE: Data Management ===== */}
      <div className="flex w-56 shrink-0 flex-col overflow-y-auto border-r bg-white text-sm">
        {/* Polygons */}
        <div className="space-y-1 border-b px-3 py-2">
          <div className="font-semibold">ポリゴン</div>
          {polygons.map((p, i) => (
            <div key={p.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedPolygonIndex(i);
                  setSelectedGroupIndex(null);
                  setEditMode({ type: "base" });
                }}
                className={`flex-1 truncate rounded px-2 py-0.5 text-left ${selectedPolygonIndex === i && selectedGroupIndex === null ? "bg-blue-100 font-semibold text-blue-800" : "hover:bg-gray-100"}`}
              >
                <span
                  className="mr-1 inline-block h-3 w-3 rounded-sm border"
                  style={{ backgroundColor: rgbaToHex(p.fillColor) }}
                />
                {p.id}
                <span className="ml-1 text-gray-500 text-xs">
                  {p.group === "outline" ? "輪郭" : "特徴"} L{p.layerIndex}
                </span>
              </button>
              {polygons.length > 1 && (
                <button
                  type="button"
                  onClick={() => deletePolygon(i)}
                  className="rounded px-1 text-red-500 hover:bg-red-50"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => addPolygon("outline")}
              className="flex-1 rounded border border-gray-400 border-dashed px-1 py-0.5 text-gray-600 hover:bg-gray-50"
            >
              + 輪郭
            </button>
            <button
              type="button"
              onClick={() => addPolygon("feature")}
              className="flex-1 rounded border border-gray-400 border-dashed px-1 py-0.5 text-gray-600 hover:bg-gray-50"
            >
              + 特徴
            </button>
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-1 border-b px-3 py-2">
          <div className="font-semibold">グループ</div>
          {featureGroups.map((g, i) => (
            <div key={g.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupIndex(selectedGroupIndex === i ? null : i);
                }}
                className={`flex-1 truncate rounded px-2 py-0.5 text-left ${selectedGroupIndex === i ? "bg-purple-100 font-semibold text-purple-800" : "hover:bg-gray-100"}`}
              >
                {g.id}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeatureGroups((prev) => prev.filter((_, j) => j !== i));
                  setPolygons((prev) =>
                    prev.map((p) =>
                      p.group === "feature" && p.groupId === g.id
                        ? { ...p, groupId: undefined }
                        : p,
                    ),
                  );
                  if (selectedGroupIndex === i) setSelectedGroupIndex(null);
                  else if (
                    selectedGroupIndex !== null &&
                    selectedGroupIndex > i
                  )
                    setSelectedGroupIndex(selectedGroupIndex - 1);
                }}
                className="rounded px-1 text-red-500 hover:bg-red-50"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const id = prompt("グループ ID");
              if (!id) return;
              setFeatureGroups((prev) => [
                ...prev,
                {
                  id,
                  yawPitchKeyframes: [],
                  visibility: {
                    yawRange: [-180, 180] as [number, number],
                    pitchRange: [-90, 90] as [number, number],
                  },
                  baseLayerIndex: 0,
                },
              ]);
              setSelectedGroupIndex(featureGroups.length);
            }}
            className="w-full rounded border border-gray-400 border-dashed px-1 py-0.5 text-gray-600 hover:bg-gray-50"
          >
            + グループ追加
          </button>
        </div>

        {/* Blend shape weights */}
        {allBlendShapeIds.length > 0 && (
          <div className="space-y-1 border-b px-3 py-2">
            <div className="font-semibold">BS重み</div>
            {allBlendShapeIds.map((bsId) => (
              <label key={bsId} className="flex items-center gap-1">
                <span className="w-16 shrink-0 truncate text-xs">{bsId}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={blendShapeWeights[bsId] ?? 0}
                  onChange={(e) =>
                    setBlendShapeWeights((prev) => ({
                      ...prev,
                      [bsId]: Number(e.target.value),
                    }))
                  }
                  className="flex-1"
                />
                <span className="w-8 text-right text-xs tabular-nums">
                  {(blendShapeWeights[bsId] ?? 0).toFixed(2)}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Display settings */}
        <div className="space-y-2 px-3 py-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={referenceVisible}
              onChange={(e) => setReferenceVisible(e.target.checked)}
            />
            <span>参考3D</span>
          </label>
          <label className="flex items-center gap-1">
            <span className="w-12 shrink-0 text-xs">参考</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={referenceOpacity}
              onChange={(e) => setReferenceOpacity(Number(e.target.value))}
              disabled={!referenceVisible}
              className="flex-1"
            />
            <span className="w-8 text-right text-xs tabular-nums">
              {referenceOpacity.toFixed(2)}
            </span>
          </label>
          <label className="flex items-center gap-1">
            <span className="w-12 shrink-0 text-xs">ポリゴン</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={faceOpacity}
              onChange={(e) => setFaceOpacity(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-8 text-right text-xs tabular-nums">
              {faceOpacity.toFixed(2)}
            </span>
          </label>
          <div className="text-gray-500 text-xs">
            yaw: {angle.yaw.toFixed(1)}° pitch: {angle.pitch.toFixed(1)}°
          </div>
        </div>

        {/* JSON IO */}
        <div className="flex gap-1 border-t px-3 py-2">
          <button
            type="button"
            onClick={() => {
              const json = exportFaceModel(model);
              downloadJson(json, "face-model.json");
            }}
            className="flex-1 rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
          >
            Export
          </button>
          <label className="flex-1 cursor-pointer rounded bg-gray-200 px-2 py-1 text-center text-xs hover:bg-gray-300">
            Import
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    const imported = importFaceModel(reader.result as string);
                    setPolygons(imported.polygons);
                    setFeatureGroups(imported.featureGroups);
                    setBlendShapeWeights(imported.blendShapeWeights);
                    setSelectedPolygonIndex(0);
                    setSelectedGroupIndex(null);
                    setEditMode({ type: "base" });
                  } catch (err) {
                    alert(`Import failed: ${err}`);
                  }
                };
                reader.readAsText(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {/* ===== CENTER PANE: Editor ===== */}
      <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-r bg-gray-50 text-sm">
        {/* Context: polygon or group */}
        {selectedGroup ? (
          /* Group editing */
          <div className="space-y-2 px-3 py-2">
            <div className="font-semibold">グループ: {selectedGroup.id}</div>
            <label className="flex items-center gap-2">
              <span className="w-20 shrink-0">基本レイヤー</span>
              <input
                type="number"
                value={selectedGroup.baseLayerIndex}
                onChange={(e) => {
                  const idx = selectedGroupIndex!;
                  setFeatureGroups((prev) =>
                    prev.map((g, i) =>
                      i === idx
                        ? { ...g, baseLayerIndex: Number(e.target.value) }
                        : g,
                    ),
                  );
                }}
                className="w-16 rounded border px-1"
              />
            </label>
            <div className="space-y-1">
              <div className="text-gray-600 text-xs">Visibility yaw</div>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={selectedGroup.visibility.yawRange[0]}
                  onChange={(e) => {
                    const idx = selectedGroupIndex!;
                    setFeatureGroups((prev) =>
                      prev.map((g, i) =>
                        i === idx
                          ? {
                              ...g,
                              visibility: {
                                ...g.visibility,
                                yawRange: [
                                  Number(e.target.value),
                                  g.visibility.yawRange[1],
                                ],
                              },
                            }
                          : g,
                      ),
                    );
                  }}
                  className="w-14 rounded border px-1"
                />
                <span>〜</span>
                <input
                  type="number"
                  value={selectedGroup.visibility.yawRange[1]}
                  onChange={(e) => {
                    const idx = selectedGroupIndex!;
                    setFeatureGroups((prev) =>
                      prev.map((g, i) =>
                        i === idx
                          ? {
                              ...g,
                              visibility: {
                                ...g.visibility,
                                yawRange: [
                                  g.visibility.yawRange[0],
                                  Number(e.target.value),
                                ],
                              },
                            }
                          : g,
                      ),
                    );
                  }}
                  className="w-14 rounded border px-1"
                />
              </div>
              <div className="text-gray-600 text-xs">Visibility pitch</div>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={selectedGroup.visibility.pitchRange[0]}
                  onChange={(e) => {
                    const idx = selectedGroupIndex!;
                    setFeatureGroups((prev) =>
                      prev.map((g, i) =>
                        i === idx
                          ? {
                              ...g,
                              visibility: {
                                ...g.visibility,
                                pitchRange: [
                                  Number(e.target.value),
                                  g.visibility.pitchRange[1],
                                ],
                              },
                            }
                          : g,
                      ),
                    );
                  }}
                  className="w-14 rounded border px-1"
                />
                <span>〜</span>
                <input
                  type="number"
                  value={selectedGroup.visibility.pitchRange[1]}
                  onChange={(e) => {
                    const idx = selectedGroupIndex!;
                    setFeatureGroups((prev) =>
                      prev.map((g, i) =>
                        i === idx
                          ? {
                              ...g,
                              visibility: {
                                ...g.visibility,
                                pitchRange: [
                                  g.visibility.pitchRange[0],
                                  Number(e.target.value),
                                ],
                              },
                            }
                          : g,
                      ),
                    );
                  }}
                  className="w-14 rounded border px-1"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-gray-600 text-xs">グループKF</div>
              {selectedGroup.yawPitchKeyframes.map((kf, ki) => (
                <div
                  key={`gkf-${kf.angle.yaw},${kf.angle.pitch}`}
                  className="space-y-1 rounded border p-1"
                >
                  <div className="flex items-center gap-1">
                    <span className="flex-1 text-xs">
                      ({kf.angle.yaw.toFixed(0)}°, {kf.angle.pitch.toFixed(0)}°)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const idx = selectedGroupIndex!;
                        setFeatureGroups((prev) =>
                          prev.map((g, i) =>
                            i === idx
                              ? {
                                  ...g,
                                  yawPitchKeyframes: g.yawPitchKeyframes.filter(
                                    (_, j) => j !== ki,
                                  ),
                                }
                              : g,
                          ),
                        );
                      }}
                      className="rounded px-1 text-red-500 hover:bg-red-50"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-6">X</span>
                    <input
                      type="number"
                      step={0.01}
                      value={kf.position[0]}
                      onChange={(e) => {
                        const idx = selectedGroupIndex!;
                        setFeatureGroups((prev) =>
                          prev.map((g, i) =>
                            i === idx
                              ? {
                                  ...g,
                                  yawPitchKeyframes: g.yawPitchKeyframes.map(
                                    (k, j) =>
                                      j === ki
                                        ? {
                                            ...k,
                                            position: [
                                              Number(e.target.value),
                                              k.position[1],
                                            ] as Point2D,
                                          }
                                        : k,
                                  ),
                                }
                              : g,
                          ),
                        );
                      }}
                      className="w-20 rounded border px-1"
                    />
                    <span className="w-6">Y</span>
                    <input
                      type="number"
                      step={0.01}
                      value={kf.position[1]}
                      onChange={(e) => {
                        const idx = selectedGroupIndex!;
                        setFeatureGroups((prev) =>
                          prev.map((g, i) =>
                            i === idx
                              ? {
                                  ...g,
                                  yawPitchKeyframes: g.yawPitchKeyframes.map(
                                    (k, j) =>
                                      j === ki
                                        ? {
                                            ...k,
                                            position: [
                                              k.position[0],
                                              Number(e.target.value),
                                            ] as Point2D,
                                          }
                                        : k,
                                  ),
                                }
                              : g,
                          ),
                        );
                      }}
                      className="w-20 rounded border px-1"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const idx = selectedGroupIndex!;
                  setFeatureGroups((prev) =>
                    prev.map((g, i) =>
                      i === idx
                        ? {
                            ...g,
                            yawPitchKeyframes: [
                              ...g.yawPitchKeyframes,
                              {
                                angle: { yaw: angle.yaw, pitch: angle.pitch },
                                position: [0, 0] as Point2D,
                                matrix: MAT2_IDENTITY,
                              },
                            ],
                          }
                        : g,
                    ),
                  );
                }}
                className="w-full rounded border border-gray-400 border-dashed px-1 py-0.5 text-gray-600 hover:bg-gray-50"
              >
                + ({angle.yaw.toFixed(0)}°, {angle.pitch.toFixed(0)}°)
              </button>
            </div>
            <div className="space-y-1">
              <div className="text-gray-600 text-xs">LayerIndex KF</div>
              {(selectedGroup.layerIndexKeyframes ?? []).map((kf, ki) => (
                <div
                  key={`li-${kf.angle.yaw},${kf.angle.pitch}`}
                  className="flex items-center gap-1"
                >
                  <span className="flex-1 text-xs">
                    ({kf.angle.yaw.toFixed(0)}°, {kf.angle.pitch.toFixed(0)}°)
                    L={kf.layerIndex}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = selectedGroupIndex!;
                      setFeatureGroups((prev) =>
                        prev.map((g, i) =>
                          i === idx
                            ? {
                                ...g,
                                layerIndexKeyframes: (
                                  g.layerIndexKeyframes ?? []
                                ).filter((_, j) => j !== ki),
                              }
                            : g,
                        ),
                      );
                    }}
                    className="rounded px-1 text-red-500 hover:bg-red-50"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="flex gap-1">
                <input
                  type="number"
                  id="layerIndexInput"
                  defaultValue={0}
                  className="w-14 rounded border px-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(
                      "layerIndexInput",
                    ) as HTMLInputElement;
                    const layerIndex = Number(input?.value ?? 0);
                    const idx = selectedGroupIndex!;
                    setFeatureGroups((prev) =>
                      prev.map((g, i) =>
                        i === idx
                          ? {
                              ...g,
                              layerIndexKeyframes: [
                                ...(g.layerIndexKeyframes ?? []),
                                {
                                  angle: { yaw: angle.yaw, pitch: angle.pitch },
                                  layerIndex,
                                },
                              ],
                            }
                          : g,
                      ),
                    );
                  }}
                  className="flex-1 rounded border border-gray-400 border-dashed px-1 py-0.5 text-gray-600 hover:bg-gray-50"
                >
                  + ({angle.yaw.toFixed(0)}°, {angle.pitch.toFixed(0)}°)
                </button>
              </div>
            </div>
          </div>
        ) : selectedPolygon ? (
          /* Polygon editing */
          <>
            {/* Properties */}
            <div className="space-y-2 border-b px-3 py-2">
              <div className="font-semibold">
                {selectedPolygon.id} (
                {selectedPolygon.group === "outline" ? "輪郭" : "特徴"})
              </div>
              <label className="flex items-center gap-2">
                <span className="w-14 shrink-0">ID</span>
                <input
                  type="text"
                  value={selectedPolygon.id}
                  onChange={(e) =>
                    updateSelectedPolygon((p) => ({ ...p, id: e.target.value }))
                  }
                  className="flex-1 rounded border px-1"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-14 shrink-0">レイヤー</span>
                <input
                  type="number"
                  value={selectedPolygon.layerIndex}
                  onChange={(e) =>
                    updateSelectedPolygon((p) => ({
                      ...p,
                      layerIndex: Number(e.target.value),
                    }))
                  }
                  className="w-16 rounded border px-1"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-14 shrink-0">色</span>
                <input
                  type="color"
                  value={rgbaToHex(selectedPolygon.fillColor)}
                  onChange={(e) =>
                    updateSelectedPolygon((p) => ({
                      ...p,
                      fillColor: hexToRgba(e.target.value),
                    }))
                  }
                />
              </label>
              {selectedPolygon.group === "feature" && (
                <>
                  <label className="flex items-center gap-2">
                    <span className="w-14 shrink-0">基本α</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={selectedPolygon.baseAlpha}
                      onChange={(e) =>
                        updateSelectedPolygon((p) => ({
                          ...p,
                          baseAlpha: Number(e.target.value),
                        }))
                      }
                      className="flex-1"
                    />
                    <span className="w-8 text-right tabular-nums">
                      {selectedPolygon.baseAlpha.toFixed(2)}
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="w-14 shrink-0">グループ</span>
                    <select
                      value={selectedPolygon.groupId ?? ""}
                      onChange={(e) =>
                        updateSelectedPolygon((p) => ({
                          ...p,
                          groupId: e.target.value || undefined,
                        }))
                      }
                      className="flex-1 rounded border px-1"
                    >
                      <option value="">なし</option>
                      {featureGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>

            {/* Point editor */}
            <div className="border-b px-3 py-1 font-semibold text-xs">
              {editMode.type === "base"
                ? "正面ベース点列"
                : editMode.type === "blendshape"
                  ? `BS: ${selectedPolygon.blendShapes[editMode.index]?.id ?? ""}`
                  : `KF ${editMode.index + 1} ${getKfAngleLabel(selectedPolygon.yawPitchKeyframes[editMode.index] as OutlineKeyframe | FeatureKeyframe)}`}
            </div>
            <div className="min-h-0 flex-1">
              <PointEditor
                points={editorPoints}
                fillColor={selectedPolygon.fillColor}
                onChange={handleEditorChange}
              />
            </div>

            {/* Feature KF alpha */}
            {selectedFeatureKf && (
              <div className="border-t px-3 py-1">
                <label className="flex items-center gap-2">
                  <span className="w-14 shrink-0">KF α</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={selectedFeatureKf.alpha}
                    onChange={(e) => {
                      const kfIndex =
                        editMode.type === "keyframe" ? editMode.index : -1;
                      if (kfIndex < 0) return;
                      updateSelectedPolygon((p) => {
                        if (p.group !== "feature") return p;
                        return {
                          ...p,
                          yawPitchKeyframes: p.yawPitchKeyframes.map((kf, i) =>
                            i === kfIndex
                              ? { ...kf, alpha: Number(e.target.value) }
                              : kf,
                          ),
                        };
                      });
                    }}
                    className="flex-1"
                  />
                  <span className="w-8 text-right tabular-nums">
                    {selectedFeatureKf.alpha.toFixed(2)}
                  </span>
                </label>
              </div>
            )}

            {/* Keyframes */}
            <div className="space-y-1 border-t px-3 py-2">
              <div className="font-semibold text-xs">キーフレーム</div>
              <button
                type="button"
                onClick={() => setEditMode({ type: "base" })}
                className={`w-full rounded px-2 py-0.5 text-left ${editMode.type === "base" ? "bg-blue-100 font-semibold text-blue-800" : "hover:bg-gray-100"}`}
              >
                正面 (ベース)
              </button>
              {selectedPolygon.yawPitchKeyframes.map((kf, i) => (
                <div
                  key={`${kf.angle.yaw},${kf.angle.pitch}`}
                  className="flex items-center gap-1"
                >
                  <button
                    type="button"
                    onClick={() => setEditMode({ type: "keyframe", index: i })}
                    className={`flex-1 rounded px-2 py-0.5 text-left ${editMode.type === "keyframe" && editMode.index === i ? "bg-blue-100 font-semibold text-blue-800" : "hover:bg-gray-100"}`}
                  >
                    {getKfAngleLabel(kf)}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteKeyframe(i)}
                    className="rounded px-1 text-red-500 hover:bg-red-50"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addKeyframe}
                className="w-full rounded border border-gray-400 border-dashed px-1 py-0.5 text-gray-600 hover:bg-gray-50"
              >
                + ({angle.yaw.toFixed(0)}°, {angle.pitch.toFixed(0)}°)
              </button>
            </div>

            {/* Blend shapes */}
            <div className="space-y-1 border-t px-3 py-2">
              <div className="font-semibold text-xs">ブレンドシェイプ</div>
              {selectedPolygon.blendShapes.map((bs, i) => (
                <div key={bs.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setEditMode({ type: "blendshape", index: i })
                    }
                    className={`flex-1 rounded px-2 py-0.5 text-left ${editMode.type === "blendshape" && editMode.index === i ? "bg-green-100 font-semibold text-green-800" : "hover:bg-gray-100"}`}
                  >
                    {bs.id}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPolygon.group === "outline")
                        updateSelectedPolygon((p) => {
                          if (p.group !== "outline") return p;
                          return {
                            ...p,
                            blendShapes: p.blendShapes.filter(
                              (_, j) => j !== i,
                            ),
                          };
                        });
                      else
                        updateSelectedPolygon((p) => {
                          if (p.group !== "feature") return p;
                          return {
                            ...p,
                            blendShapes: p.blendShapes.filter(
                              (_, j) => j !== i,
                            ),
                          };
                        });
                      if (
                        editMode.type === "blendshape" &&
                        editMode.index === i
                      )
                        setEditMode({ type: "base" });
                    }}
                    className="rounded px-1 text-red-500 hover:bg-red-50"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const id = prompt("ブレンドシェイプ ID");
                  if (!id) return;
                  const deltas: Point2D[] = selectedPolygon.basePoints.map(
                    () => [0, 0],
                  );
                  if (selectedPolygon.group === "outline")
                    updateSelectedPolygon((p) => {
                      if (p.group !== "outline") return p;
                      return {
                        ...p,
                        blendShapes: [...p.blendShapes, { id, deltas }],
                      };
                    });
                  else
                    updateSelectedPolygon((p) => {
                      if (p.group !== "feature") return p;
                      return {
                        ...p,
                        blendShapes: [
                          ...p.blendShapes,
                          { id, deltas, alphaDelta: 0 },
                        ],
                      };
                    });
                  setEditMode({
                    type: "blendshape",
                    index: selectedPolygon.blendShapes.length,
                  });
                }}
                className="w-full rounded border border-gray-400 border-dashed px-1 py-0.5 text-gray-600 hover:bg-gray-50"
              >
                + BS追加
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* ===== RIGHT PANE: 3D Preview ===== */}
      <div className="relative h-full min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-0">
          <ReferenceScene
            yaw={angle.yaw}
            pitch={angle.pitch}
            zoom={zoom}
            opacity={referenceOpacity}
            visible={referenceVisible}
          />
        </div>
        <div className="absolute inset-0">
          <Scene
            model={model}
            angle={angle}
            faceOpacity={faceOpacity}
            zoom={zoom}
            onAngleChange={handleAngleChange}
            onZoomChange={handleZoomChange}
          />
        </div>
      </div>
    </div>
  );
}
