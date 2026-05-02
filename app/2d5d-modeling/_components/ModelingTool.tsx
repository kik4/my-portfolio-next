"use client";

import { useEffect, useMemo, useState } from "react";
import { buildDefaultFaceModel, buildDefaultPart } from "../_lib/defaultModel";
import {
  loadFaceModelFromLocalStorage,
  saveFaceModelToLocalStorage,
  serializeFaceModel,
} from "../_lib/jsonIO";
import type { FaceModel, Part, Vec2, Vec3, ViewKeyframe } from "../_lib/types";
import { Scene } from "./Scene";

const normalizeVec3 = (v: Vec3): Vec3 => {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len === 0) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
};

export const ModelingTool = () => {
  // Always start with the default model so SSR and the first client render agree.
  // Hydrate from localStorage in an effect to avoid hydration mismatch.
  const [model, setModel] = useState<FaceModel>(() => buildDefaultFaceModel());
  const [hydrated, setHydrated] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    const loaded = loadFaceModelFromLocalStorage();
    if (loaded) setModel(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveFaceModelToLocalStorage(model);
  }, [model, hydrated]);

  const selectedPart = useMemo<Part | null>(
    () => model.parts.find((p) => p.id === selectedPartId) ?? null,
    [model.parts, selectedPartId],
  );

  const updateHeadSampleField = (
    field: "frontHalfXs" | "sideZFronts" | "sideZBacks",
    index: number,
    value: number,
  ) => {
    setModel((m) => {
      const arr = [...m.head[field]];
      arr[index] = value;
      return { ...m, head: { ...m.head, [field]: arr } };
    });
  };

  const updateHeadYSample = (index: number, value: number) => {
    setModel((m) => {
      const ys = [...m.head.ySamples];
      ys[index] = value;
      return { ...m, head: { ...m.head, ySamples: ys } };
    });
  };

  const updatePart = (id: string, mut: (p: Part) => Part) => {
    setModel((m) => ({
      ...m,
      parts: m.parts.map((p) => (p.id === id ? mut(p) : p)),
    }));
  };

  const addPart = () => {
    const id = `part-${Date.now()}`;
    const part = buildDefaultPart(id, "new part");
    setModel((m) => ({ ...m, parts: [...m.parts, part] }));
    setSelectedPartId(id);
  };

  const removePart = (id: string) => {
    setModel((m) => ({ ...m, parts: m.parts.filter((p) => p.id !== id) }));
    if (selectedPartId === id) setSelectedPartId(null);
  };

  const exportJson = () => {
    const blob = new Blob([serializeFaceModel(model)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "face-model.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.version === 3) setModel(parsed);
    } catch {
      // ignore malformed input
    }
  };

  const resetModel = () => {
    if (confirm("デフォルトモデルにリセットしますか?")) {
      setModel(buildDefaultFaceModel());
      setSelectedPartId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-80 shrink-0 overflow-y-auto border-r bg-white p-4 text-sm">
        <h2 className="mb-2 font-bold">頭メッシュ</h2>
        <div className="mb-4 space-y-2">
          <label className="block">
            <span className="block text-gray-600 text-xs">塗り色</span>
            <input
              type="color"
              value={model.head.fillColor}
              onChange={(e) =>
                setModel((m) => ({
                  ...m,
                  head: { ...m.head, fillColor: e.target.value },
                }))
              }
            />
          </label>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={model.head.outline.enabled}
                onChange={(e) =>
                  setModel((m) => ({
                    ...m,
                    head: {
                      ...m.head,
                      outline: {
                        ...m.head.outline,
                        enabled: e.target.checked,
                      },
                    },
                  }))
                }
              />
              輪郭線
            </label>
            {model.head.outline.enabled && (
              <div className="mt-1 ml-6 flex items-center gap-2">
                <input
                  type="color"
                  value={model.head.outline.color}
                  onChange={(e) =>
                    setModel((m) => ({
                      ...m,
                      head: {
                        ...m.head,
                        outline: {
                          ...m.head.outline,
                          color: e.target.value,
                        },
                      },
                    }))
                  }
                />
                <input
                  type="number"
                  step={0.001}
                  min={0}
                  max={0.1}
                  value={model.head.outline.thickness}
                  onChange={(e) =>
                    setModel((m) => ({
                      ...m,
                      head: {
                        ...m.head,
                        outline: {
                          ...m.head.outline,
                          thickness: Number(e.target.value),
                        },
                      },
                    }))
                  }
                  className="w-20 rounded border px-1"
                />
              </div>
            )}
          </div>
          <label className="block">
            <span className="block text-gray-600 text-xs">張力</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={model.head.catmullRomTension}
              onChange={(e) =>
                setModel((m) => ({
                  ...m,
                  head: {
                    ...m.head,
                    catmullRomTension: Number(e.target.value),
                  },
                }))
              }
              className="w-full"
            />
            <span className="text-gray-600 text-xs">
              {model.head.catmullRomTension.toFixed(2)}
            </span>
          </label>
          <label className="block">
            <span className="block text-gray-600 text-xs">円周分割</span>
            <input
              type="number"
              min={6}
              max={128}
              value={model.head.ringSegments}
              onChange={(e) =>
                setModel((m) => ({
                  ...m,
                  head: { ...m.head, ringSegments: Number(e.target.value) },
                }))
              }
              className="w-20 rounded border px-1"
            />
          </label>
          <details>
            <summary className="cursor-pointer text-gray-600 text-xs">
              シルエット制御点 ({model.head.ySamples.length})
            </summary>
            <table className="mt-1 w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th>Y</th>
                  <th>halfX</th>
                  <th>zFront</th>
                  <th>zBack</th>
                </tr>
              </thead>
              <tbody>
                {model.head.ySamples.map((y, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: row position is the identity here
                  <tr key={i}>
                    <td>
                      <input
                        type="number"
                        step={0.05}
                        value={y}
                        onChange={(e) =>
                          updateHeadYSample(i, Number(e.target.value))
                        }
                        className="w-14 rounded border px-1"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step={0.05}
                        value={model.head.frontHalfXs[i]}
                        onChange={(e) =>
                          updateHeadSampleField(
                            "frontHalfXs",
                            i,
                            Number(e.target.value),
                          )
                        }
                        className="w-14 rounded border px-1"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step={0.05}
                        value={model.head.sideZFronts[i]}
                        onChange={(e) =>
                          updateHeadSampleField(
                            "sideZFronts",
                            i,
                            Number(e.target.value),
                          )
                        }
                        className="w-14 rounded border px-1"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step={0.05}
                        value={model.head.sideZBacks[i]}
                        onChange={(e) =>
                          updateHeadSampleField(
                            "sideZBacks",
                            i,
                            Number(e.target.value),
                          )
                        }
                        className="w-14 rounded border px-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAxes}
              onChange={(e) => setShowAxes(e.target.checked)}
            />
            軸表示
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            グリッド
          </label>
        </div>

        <h2 className="mb-2 font-bold">パーツ</h2>
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={addPart}
            className="rounded bg-blue-500 px-2 py-1 text-white text-xs hover:bg-blue-600"
          >
            + 追加
          </button>
        </div>
        <ul className="mb-4 space-y-1">
          {model.parts.map((part) => (
            <li
              key={part.id}
              className={`flex items-center justify-between rounded text-xs ${
                selectedPartId === part.id
                  ? "bg-blue-100 text-blue-800"
                  : "hover:bg-gray-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedPartId(part.id)}
                className="flex-1 px-2 py-1 text-left"
              >
                {part.name}
              </button>
              <button
                type="button"
                onClick={() => removePart(part.id)}
                className="px-2 py-1 text-red-500 hover:text-red-700"
                aria-label={`${part.name} を削除`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {selectedPart && (
          <PartEditor part={selectedPart} updatePart={updatePart} />
        )}

        <div className="mt-4 space-y-2 border-t pt-4">
          <h3 className="font-bold text-sm">JSON</h3>
          <button
            type="button"
            onClick={exportJson}
            className="block w-full rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
          >
            書き出し
          </button>
          <label className="block w-full cursor-pointer rounded bg-gray-200 px-2 py-1 text-center text-xs hover:bg-gray-300">
            読み込み
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importJson(file);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={resetModel}
            className="block w-full rounded bg-red-100 px-2 py-1 text-red-700 text-xs hover:bg-red-200"
          >
            デフォルトに戻す
          </button>
        </div>
      </aside>

      <main className="min-h-0 flex-1">
        <Scene model={model} showAxes={showAxes} showGrid={showGrid} />
      </main>
    </div>
  );
};

interface PartEditorProps {
  part: Part;
  updatePart: (id: string, mut: (p: Part) => Part) => void;
}

const PartEditor = ({ part, updatePart }: PartEditorProps) => {
  // Phase 1: edit only the first view keyframe.
  const kf = part.viewKeyframes[0];

  const updateKf = (mut: (k: ViewKeyframe) => ViewKeyframe) => {
    updatePart(part.id, (p) => ({
      ...p,
      viewKeyframes: [mut(p.viewKeyframes[0]), ...p.viewKeyframes.slice(1)],
    }));
  };

  return (
    <div className="space-y-2 rounded border bg-gray-50 p-2 text-xs">
      <label className="block">
        <span className="block text-gray-600">名前</span>
        <input
          type="text"
          value={part.name}
          onChange={(e) =>
            updatePart(part.id, (p) => ({ ...p, name: e.target.value }))
          }
          className="w-full rounded border px-1"
        />
      </label>
      <label className="block">
        <span className="block text-gray-600">塗り色</span>
        <input
          type="color"
          value={part.fillColor}
          onChange={(e) =>
            updatePart(part.id, (p) => ({ ...p, fillColor: e.target.value }))
          }
        />
      </label>
      <label className="block">
        <span className="block text-gray-600">layerIndex</span>
        <input
          type="number"
          value={part.layerIndex}
          onChange={(e) =>
            updatePart(part.id, (p) => ({
              ...p,
              layerIndex: Number(e.target.value),
            }))
          }
          className="w-20 rounded border px-1"
        />
      </label>
      <fieldset>
        <legend className="text-gray-600">anchor (x, y, z)</legend>
        <div className="flex gap-1">
          {(["x", "y", "z"] as const).map((axis, i) => (
            <input
              key={axis}
              aria-label={`anchor ${axis}`}
              type="number"
              step={0.05}
              value={kf.placement.anchor[i]}
              onChange={(e) => {
                const v = Number(e.target.value);
                updateKf((k) => {
                  const next: Vec3 = [...k.placement.anchor] as Vec3;
                  next[i] = v;
                  return {
                    ...k,
                    placement: {
                      ...k.placement,
                      anchor: normalizeVec3(next),
                    },
                  };
                });
              }}
              className="w-16 rounded border px-1"
            />
          ))}
        </div>
        <p className="text-gray-500">入力後に自動正規化されます</p>
      </fieldset>
      <label className="block">
        <span className="block text-gray-600">offsetNormal</span>
        <input
          type="number"
          step={0.005}
          value={kf.placement.offsetNormal}
          onChange={(e) =>
            updateKf((k) => ({
              ...k,
              placement: {
                ...k.placement,
                offsetNormal: Number(e.target.value),
              },
            }))
          }
          className="w-20 rounded border px-1"
        />
      </label>
      <fieldset>
        <legend className="text-gray-600">scale (x, y)</legend>
        <div className="flex gap-1">
          {(["x", "y"] as const).map((axis, i) => (
            <input
              key={axis}
              aria-label={`scale ${axis}`}
              type="number"
              step={0.1}
              value={kf.placement.scale[i]}
              onChange={(e) => {
                const v = Number(e.target.value);
                updateKf((k) => {
                  const next: Vec2 = [...k.placement.scale] as Vec2;
                  next[i] = v;
                  return {
                    ...k,
                    placement: { ...k.placement, scale: next },
                  };
                });
              }}
              className="w-16 rounded border px-1"
            />
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="block text-gray-600">α</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={kf.alpha}
          onChange={(e) =>
            updateKf((k) => ({ ...k, alpha: Number(e.target.value) }))
          }
          className="w-full"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={kf.visible}
          onChange={(e) =>
            updateKf((k) => ({ ...k, visible: e.target.checked }))
          }
        />
        表示
      </label>
      <details>
        <summary className="cursor-pointer text-gray-600">
          形状制御点 ({kf.shape.basePoints.length})
        </summary>
        <table className="mt-1 w-full">
          <thead>
            <tr className="text-gray-500">
              <th>X</th>
              <th>Y</th>
            </tr>
          </thead>
          <tbody>
            {kf.shape.basePoints.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: control-point index is its identity
              <tr key={i}>
                <td>
                  <input
                    aria-label={`shape point ${i} x`}
                    type="number"
                    step={0.01}
                    value={p[0]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateKf((k) => {
                        const pts = k.shape.basePoints.map(
                          (q, idx) =>
                            (idx === i ? [v, q[1]] : q) as [number, number],
                        );
                        return {
                          ...k,
                          shape: { ...k.shape, basePoints: pts },
                        };
                      });
                    }}
                    className="w-16 rounded border px-1"
                  />
                </td>
                <td>
                  <input
                    aria-label={`shape point ${i} y`}
                    type="number"
                    step={0.01}
                    value={p[1]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateKf((k) => {
                        const pts = k.shape.basePoints.map(
                          (q, idx) =>
                            (idx === i ? [q[0], v] : q) as [number, number],
                        );
                        return {
                          ...k,
                          shape: { ...k.shape, basePoints: pts },
                        };
                      });
                    }}
                    className="w-16 rounded border px-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
};
