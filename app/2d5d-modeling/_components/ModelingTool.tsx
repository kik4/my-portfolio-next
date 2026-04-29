"use client";

import { useCallback, useEffect, useState } from "react";
import { moveVertex, setVertexSharpness } from "../_lib/headMeshEdit";
import {
  buildDefaultFaceModel,
  downloadJson,
  exportFaceModel,
  importFaceModel,
} from "../_lib/jsonIO";
import type {
  ColorRGBA,
  FaceModel,
  InterpolationMode,
  Part,
  Vec3,
  YawPitch,
} from "../_lib/types";
import { Scene } from "./Scene";

const LS_KEY = "2d5d-modeling-data-v2";

function loadFromLocalStorage(): FaceModel | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return importFaceModel(raw);
  } catch {
    return null;
  }
}

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function createDefaultPart(): Part {
  return {
    id: genId("part"),
    name: "新しいパーツ",
    placement: {
      anchor: [0, 0, 1],
      offsetNormal: 0.001,
      offsetTangent: [0, 0],
      rotationOffset: [0, 0, 0],
    },
    shape: {
      basePoints: [
        [-0.04, -0.02],
        [0.04, -0.02],
        [0.04, 0.02],
        [-0.04, 0.02],
      ],
      layerIndex: 0,
    },
    fillColor: [0.2, 0.2, 0.2, 1],
    fillEnabled: true,
    strokeColor: null,
    strokeWidth: 2,
    baseAlpha: 1,
    yawPitchKeyframes: [],
    blendShapes: [],
  };
}

function rgbaToHex(c: ColorRGBA): string {
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

function hexToRgba(hex: string, alpha = 1): ColorRGBA {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, alpha];
}

function normalizeVec3(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len === 0) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function ModelingTool() {
  // Always start with the default model on the server so SSR HTML matches the
  // initial client render. localStorage data is loaded after mount.
  const [model, setModel] = useState<FaceModel>(() => buildDefaultFaceModel());
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const stored = loadFromLocalStorage();
    if (stored) setModel(stored);
    setHydrated(true);
  }, []);
  const [angle, setAngle] = useState<YawPitch>({ yaw: 0, pitch: 0 });
  const [angleSource, setAngleSource] = useState<"slider" | "controls">(
    "slider",
  );
  const [selectedVertexId, setSelectedVertexId] = useState<string | null>(null);
  const [selectedPartIndex, setSelectedPartIndex] = useState<number | null>(
    null,
  );
  const [showWireframe, setShowWireframe] = useState(true);
  const [showControlVertices, setShowControlVertices] = useState(true);
  const [symmetric, setSymmetric] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Persist to localStorage on every model change, but only after hydration so
  // we don't clobber stored data with the default model on first render.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_KEY, exportFaceModel(model));
    } catch {
      // Ignore quota errors.
    }
  }, [model, hydrated]);

  const selectedVertex = selectedVertexId
    ? model.head.controlMesh.vertices.find((v) => v.id === selectedVertexId)
    : undefined;
  const selectedPart =
    selectedPartIndex != null ? model.parts[selectedPartIndex] : undefined;

  const handleMoveVertex = useCallback(
    (id: string, newPos: Vec3) => {
      setModel((prev) => ({
        ...prev,
        head: {
          ...prev.head,
          controlMesh: moveVertex(prev.head.controlMesh, id, newPos, symmetric),
        },
      }));
    },
    [symmetric],
  );

  const handleSetSharpness = useCallback(
    (id: string, sharpness: number) => {
      setModel((prev) => ({
        ...prev,
        head: {
          ...prev.head,
          controlMesh: setVertexSharpness(
            prev.head.controlMesh,
            id,
            sharpness,
            symmetric,
          ),
        },
      }));
    },
    [symmetric],
  );

  const handleSubdivisionLevel = (level: number) => {
    const clamped = Math.max(0, Math.min(4, Math.floor(level)));
    setModel((prev) => ({
      ...prev,
      head: { ...prev.head, subdivisionLevel: clamped },
    }));
  };

  const handleHeadFillColor = (hex: string) => {
    setModel((prev) => ({
      ...prev,
      headFillColor: hexToRgba(hex, prev.headFillColor[3]),
    }));
  };

  const handleResetHead = () => {
    if (!confirm("頭メッシュをプリセット状態にリセットしますか？")) return;
    setModel((prev) => ({ ...prev, head: buildDefaultFaceModel().head }));
    setSelectedVertexId(null);
  };

  const handleAddPart = () => {
    const part = createDefaultPart();
    setModel((prev) => ({ ...prev, parts: [...prev.parts, part] }));
    setSelectedPartIndex(model.parts.length);
  };

  const handleDeletePart = (idx: number) => {
    setModel((prev) => ({
      ...prev,
      parts: prev.parts.filter((_, i) => i !== idx),
    }));
    setSelectedPartIndex(null);
  };

  const updatePart = (idx: number, patch: Partial<Part>) => {
    setModel((prev) => ({
      ...prev,
      parts: prev.parts.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  };

  const handleExport = () => {
    downloadJson(exportFaceModel(model), "face-model.json");
  };

  const handleImport = (file: File) => {
    file.text().then((text) => {
      try {
        const next = importFaceModel(text);
        setModel(next);
        setSelectedVertexId(null);
        setSelectedPartIndex(null);
      } catch (e) {
        alert(`読み込みに失敗しました: ${(e as Error).message}`);
      }
    });
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 3D viewport */}
      <div className="relative flex-1">
        <Scene
          model={model}
          angle={angle}
          angleSource={angleSource}
          faceOpacity={1}
          showAxes={showAxes}
          showGrid={showGrid}
          selectedVertexId={selectedVertexId}
          showWireframe={showWireframe}
          showControlVertices={showControlVertices}
          symmetric={symmetric}
          onSelectVertex={(id) => {
            setSelectedVertexId(id);
            setAngleSource("controls");
          }}
          onMoveVertex={handleMoveVertex}
          onAngleChange={(yaw, pitch) => {
            setAngle({ yaw, pitch });
            setAngleSource("controls");
          }}
        />

        {/* Top-left HUD: angle sliders */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 rounded-md border border-gray-200 bg-white/90 p-3 text-xs shadow">
          <label className="flex items-center gap-2">
            <span className="w-12 text-right">yaw</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={angle.yaw}
              onChange={(e) => {
                setAngle((a) => ({ ...a, yaw: Number(e.target.value) }));
                setAngleSource("slider");
              }}
            />
            <span className="w-10 text-right">{angle.yaw.toFixed(0)}°</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-12 text-right">pitch</span>
            <input
              type="range"
              min={-89}
              max={89}
              step={1}
              value={angle.pitch}
              onChange={(e) => {
                setAngle((a) => ({ ...a, pitch: Number(e.target.value) }));
                setAngleSource("slider");
              }}
            />
            <span className="w-10 text-right">{angle.pitch.toFixed(0)}°</span>
          </label>
        </div>
      </div>

      {/* Right panel */}
      <aside className="w-90 shrink-0 overflow-y-auto border-gray-200 border-l bg-white p-4 text-sm">
        {/* Head mesh editing */}
        <section className="mb-6">
          <h2 className="mb-2 font-semibold text-gray-800">頭メッシュ</h2>
          <div className="mb-2 flex flex-wrap gap-2">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showWireframe}
                onChange={(e) => setShowWireframe(e.target.checked)}
              />
              ワイヤ
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showControlVertices}
                onChange={(e) => setShowControlVertices(e.target.checked)}
              />
              制御点
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={symmetric}
                onChange={(e) => setSymmetric(e.target.checked)}
              />
              対称ロック
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={(e) => setShowAxes(e.target.checked)}
              />
              軸
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              グリッド
            </label>
          </div>
          <label className="mb-2 flex items-center gap-2">
            <span className="w-32">細分化レベル</span>
            <input
              type="number"
              min={0}
              max={4}
              step={1}
              value={model.head.subdivisionLevel}
              onChange={(e) =>
                handleSubdivisionLevel(Number(e.target.value) || 0)
              }
              className="w-16 rounded border px-2 py-1"
            />
          </label>
          <label className="mb-2 flex items-center gap-2">
            <span className="w-32">頭の色</span>
            <input
              type="color"
              value={rgbaToHex(model.headFillColor)}
              onChange={(e) => handleHeadFillColor(e.target.value)}
            />
          </label>
          <div className="mb-2 rounded border border-gray-200 p-2">
            <label className="mb-1 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={model.headOutline.enabled}
                onChange={(e) =>
                  setModel((prev) => ({
                    ...prev,
                    headOutline: {
                      ...prev.headOutline,
                      enabled: e.target.checked,
                    },
                  }))
                }
              />
              輪郭線
            </label>
            <label className="mb-1 flex items-center gap-2 text-xs">
              <span className="w-12 text-gray-500">色</span>
              <input
                type="color"
                value={rgbaToHex(model.headOutline.color)}
                onChange={(e) =>
                  setModel((prev) => ({
                    ...prev,
                    headOutline: {
                      ...prev.headOutline,
                      color: hexToRgba(
                        e.target.value,
                        prev.headOutline.color[3],
                      ),
                    },
                  }))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <span className="w-12 text-gray-500">太さ</span>
              <input
                type="range"
                min={0}
                max={0.03}
                step={0.001}
                value={model.headOutline.thickness}
                onChange={(e) =>
                  setModel((prev) => ({
                    ...prev,
                    headOutline: {
                      ...prev.headOutline,
                      thickness: Number(e.target.value),
                    },
                  }))
                }
                className="flex-1"
              />
              <span className="w-12 text-right">
                {model.headOutline.thickness.toFixed(3)}
              </span>
            </label>
          </div>
          <button
            type="button"
            className="mb-2 rounded border border-red-300 px-2 py-1 text-red-700 text-xs hover:bg-red-50"
            onClick={handleResetHead}
          >
            プリセットにリセット
          </button>

          {/* Selected vertex */}
          <div className="mt-2 rounded border border-gray-200 p-2">
            <div className="mb-1 text-gray-500 text-xs">選択中の制御頂点</div>
            {selectedVertex ? (
              <>
                <div className="mb-1 break-all text-xs">
                  id: {selectedVertex.id}
                  {selectedVertex.onMidplane && " (中央線)"}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(["x", "y", "z"] as const).map((axis, axisIdx) => (
                    <label key={axis} className="flex flex-col text-xs">
                      <span className="text-gray-500">{axis}</span>
                      <input
                        type="number"
                        step={0.01}
                        value={selectedVertex.position[axisIdx].toFixed(3)}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const next: Vec3 = [...selectedVertex.position];
                          next[axisIdx] = v;
                          handleMoveVertex(selectedVertex.id, next);
                        }}
                        className="rounded border px-1 py-0.5"
                      />
                    </label>
                  ))}
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <span className="w-16 text-gray-500">尖り</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedVertex.sharpness ?? 0}
                    onChange={(e) =>
                      handleSetSharpness(
                        selectedVertex.id,
                        Number(e.target.value),
                      )
                    }
                    className="flex-1"
                  />
                  <span className="w-8 text-right">
                    {(selectedVertex.sharpness ?? 0).toFixed(2)}
                  </span>
                </label>
              </>
            ) : (
              <div className="text-gray-400 text-xs">未選択</div>
            )}
          </div>
        </section>

        {/* Parts */}
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">パーツ</h2>
            <button
              type="button"
              className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50"
              onClick={handleAddPart}
            >
              + 追加
            </button>
          </div>
          <ul className="mb-2 max-h-32 overflow-y-auto rounded border border-gray-200">
            {model.parts.length === 0 && (
              <li className="px-2 py-1 text-gray-400 text-xs">なし</li>
            )}
            {model.parts.map((p, idx) => (
              <li
                key={p.id}
                className={`flex items-center justify-between border-gray-100 border-b px-2 py-1 ${
                  selectedPartIndex === idx ? "bg-blue-50" : ""
                }`}
              >
                <button
                  type="button"
                  className="flex-1 text-left text-xs"
                  onClick={() => setSelectedPartIndex(idx)}
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  className="ml-1 text-gray-400 text-xs hover:text-red-600"
                  onClick={() => handleDeletePart(idx)}
                  aria-label="削除"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          {selectedPart && selectedPartIndex !== null && (
            <div className="space-y-2 rounded border border-gray-200 p-2 text-xs">
              <label className="flex items-center gap-2">
                <span className="w-20">名前</span>
                <input
                  type="text"
                  value={selectedPart.name}
                  onChange={(e) =>
                    updatePart(selectedPartIndex, { name: e.target.value })
                  }
                  className="flex-1 rounded border px-1 py-0.5"
                />
              </label>
              <div>
                <div className="mb-1 text-gray-500">anchor (方向)</div>
                <div className="grid grid-cols-3 gap-1">
                  {(["x", "y", "z"] as const).map((axis, idx) => (
                    <label key={axis} className="flex flex-col">
                      <span className="text-gray-500">{axis}</span>
                      <input
                        type="number"
                        step={0.05}
                        value={selectedPart.placement.anchor[idx].toFixed(3)}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const a: Vec3 = [...selectedPart.placement.anchor];
                          a[idx] = v;
                          updatePart(selectedPartIndex, {
                            placement: { ...selectedPart.placement, anchor: a },
                          });
                        }}
                        className="rounded border px-1 py-0.5"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-1 rounded border px-2 py-0.5 hover:bg-gray-50"
                  onClick={() =>
                    updatePart(selectedPartIndex, {
                      placement: {
                        ...selectedPart.placement,
                        anchor: normalizeVec3(selectedPart.placement.anchor),
                      },
                    })
                  }
                >
                  正規化
                </button>
              </div>
              <label className="flex items-center gap-2">
                <span className="w-24">offsetNormal</span>
                <input
                  type="number"
                  step={0.001}
                  value={selectedPart.placement.offsetNormal}
                  onChange={(e) =>
                    updatePart(selectedPartIndex, {
                      placement: {
                        ...selectedPart.placement,
                        offsetNormal: Number(e.target.value),
                      },
                    })
                  }
                  className="w-24 rounded border px-1 py-0.5"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-24">塗り色</span>
                <input
                  type="color"
                  value={rgbaToHex(selectedPart.fillColor)}
                  onChange={(e) =>
                    updatePart(selectedPartIndex, {
                      fillColor: hexToRgba(
                        e.target.value,
                        selectedPart.fillColor[3],
                      ),
                    })
                  }
                />
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedPart.fillEnabled}
                    onChange={(e) =>
                      updatePart(selectedPartIndex, {
                        fillEnabled: e.target.checked,
                      })
                    }
                  />
                  有効
                </label>
              </label>
              <label className="flex items-center gap-2">
                <span className="w-24">baseAlpha</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selectedPart.baseAlpha}
                  onChange={(e) =>
                    updatePart(selectedPartIndex, {
                      baseAlpha: Number(e.target.value),
                    })
                  }
                  className="w-20 rounded border px-1 py-0.5"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-24">layerIndex</span>
                <input
                  type="number"
                  step={1}
                  value={selectedPart.shape.layerIndex}
                  onChange={(e) =>
                    updatePart(selectedPartIndex, {
                      shape: {
                        ...selectedPart.shape,
                        layerIndex: Number(e.target.value),
                      },
                    })
                  }
                  className="w-20 rounded border px-1 py-0.5"
                />
              </label>
            </div>
          )}
        </section>

        {/* Interpolation mode + IO */}
        <section className="mb-6">
          <h2 className="mb-2 font-semibold text-gray-800">補間モード</h2>
          <select
            value={model.interpolationMode}
            onChange={(e) =>
              setModel((prev) => ({
                ...prev,
                interpolationMode: e.target.value as InterpolationMode,
              }))
            }
            className="w-full rounded border px-2 py-1 text-xs"
          >
            <option value="rbf-gaussian">RBF Gaussian</option>
            <option value="rbf-gaussian-regularized">
              RBF Gaussian (正則化)
            </option>
            <option value="linear-delaunay">Linear Delaunay</option>
          </select>
        </section>

        <section className="flex gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
            onClick={handleExport}
          >
            書き出し
          </button>
          <label className="cursor-pointer rounded border px-2 py-1 text-xs hover:bg-gray-50">
            読み込み
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
          </label>
        </section>
      </aside>
    </div>
  );
}
