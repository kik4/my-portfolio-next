"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildDefaultFaceModel, buildDefaultPart } from "../_lib/defaultModel";
import {
  loadFaceModelFromLocalStorage,
  saveFaceModelToLocalStorage,
  serializeFaceModel,
} from "../_lib/jsonIO";
import type {
  FaceModel,
  Part,
  PartShape,
  Vec2,
  Vec3,
  ViewKeyframe,
} from "../_lib/types";
import { useHistory } from "../_lib/useHistory";
import { AnimKeyframeEditor } from "./AnimKeyframeEditor";
import { AnimParamsPanel } from "./AnimParamsPanel";
import { PointEditor } from "./PointEditor";
import { Scene } from "./Scene";

const normalizeVec3 = (v: Vec3): Vec3 => {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len === 0) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
};

// Find the index of the keyframe whose (yaw, pitch) is closest in spherical
// angle to the camera's current angles. Returns -1 if there are no keyframes.
const nearestKeyframeIndex = (
  keyframes: { yaw: number; pitch: number }[],
  yaw: number,
  pitch: number,
): number => {
  if (keyframes.length === 0) return -1;
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  const cp = Math.cos(pitchRad);
  const target = [
    cp * Math.sin(yawRad),
    Math.sin(pitchRad),
    cp * Math.cos(yawRad),
  ];
  let bestIdx = 0;
  let bestDot = -Infinity;
  keyframes.forEach((k, i) => {
    const yr = (k.yaw * Math.PI) / 180;
    const pr = (k.pitch * Math.PI) / 180;
    const ccp = Math.cos(pr);
    const v = [ccp * Math.sin(yr), Math.sin(pr), ccp * Math.cos(yr)];
    const dot = v[0] * target[0] + v[1] * target[1] + v[2] * target[2];
    if (dot > bestDot) {
      bestDot = dot;
      bestIdx = i;
    }
  });
  return bestIdx;
};

export const ModelingTool = () => {
  // History-tracked model. SSR / first client render see the default model;
  // localStorage is hydrated in an effect via replace() (no history entry).
  const history = useHistory<FaceModel>(buildDefaultFaceModel());
  const {
    state: model,
    commit,
    replace,
    undo,
    redo,
    canUndo,
    canRedo,
  } = history;
  const [hydrated, setHydrated] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  // Index of the view keyframe currently being edited, scoped per selected part.
  const [editingKfIndex, setEditingKfIndex] = useState(0);
  // Index of the anim keyframe currently being edited, scoped per selected part.
  const [editingAnimKfIndex, setEditingAnimKfIndex] = useState(0);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  // Camera angles fed by Scene every frame.
  const [cameraYaw, setCameraYaw] = useState(0);
  const [cameraPitch, setCameraPitch] = useState(0);

  useEffect(() => {
    const loaded = loadFaceModelFromLocalStorage();
    if (loaded) replace(loaded);
    setHydrated(true);
  }, [replace]);

  useEffect(() => {
    if (!hydrated) return;
    saveFaceModelToLocalStorage(model);
  }, [model, hydrated]);

  // Keyboard Undo/Redo (Ctrl/Cmd + Z / Shift+Z).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const target = e.target as HTMLElement | null;
      // Don't intercept undo while the user is typing into a text/number input.
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const selectedPart = useMemo<Part | null>(
    () => model.parts.find((p) => p.id === selectedPartId) ?? null,
    [model.parts, selectedPartId],
  );

  // Keep latest camera angles + keyframes in refs so the part-selection
  // effect can read them without becoming dependent on every camera tick.
  const cameraYawRef = useRef(cameraYaw);
  const cameraPitchRef = useRef(cameraPitch);
  const selectedPartRef = useRef(selectedPart);
  cameraYawRef.current = cameraYaw;
  cameraPitchRef.current = cameraPitch;
  selectedPartRef.current = selectedPart;

  // When selection changes, jump the editing keyframe to the one nearest the
  // current camera angles. Camera and part are read via refs so we don't
  // re-run on every camera tick.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref values are intentional
  useEffect(() => {
    const part = selectedPartRef.current;
    if (!part) {
      setEditingKfIndex(0);
      return;
    }
    const idx = nearestKeyframeIndex(
      part.viewKeyframes,
      cameraYawRef.current,
      cameraPitchRef.current,
    );
    setEditingKfIndex(Math.max(idx, 0));
  }, [selectedPartId]);

  const updateHeadSampleField = (
    field: "frontHalfXs" | "sideZFronts" | "sideZBacks",
    index: number,
    value: number,
  ) => {
    commit((m) => {
      const arr = [...m.head[field]];
      arr[index] = value;
      return { ...m, head: { ...m.head, [field]: arr } };
    });
  };

  const updateHeadYSample = (index: number, value: number) => {
    commit((m) => {
      const ys = [...m.head.ySamples];
      ys[index] = value;
      return { ...m, head: { ...m.head, ySamples: ys } };
    });
  };

  const updatePart = useCallback(
    (id: string, mut: (p: Part) => Part) => {
      commit((m) => ({
        ...m,
        parts: m.parts.map((p) => (p.id === id ? mut(p) : p)),
      }));
    },
    [commit],
  );

  const addPart = () => {
    const id = `part-${Date.now()}`;
    const part = buildDefaultPart(id, "new part");
    commit((m) => ({ ...m, parts: [...m.parts, part] }));
    setSelectedPartId(id);
  };

  const removePart = (id: string) => {
    commit((m) => ({ ...m, parts: m.parts.filter((p) => p.id !== id) }));
    if (selectedPartId === id) setSelectedPartId(null);
  };

  // ===== View Keyframe edits =====
  const addViewKeyframeAtCamera = (partId: string) => {
    const part = model.parts.find((p) => p.id === partId);
    if (!part) return;
    const baseIdx = nearestKeyframeIndex(
      part.viewKeyframes,
      cameraYaw,
      cameraPitch,
    );
    const base = part.viewKeyframes[Math.max(baseIdx, 0)];
    const newKf: ViewKeyframe = {
      ...base,
      id: `vk-${Date.now()}`,
      yaw: cameraYaw,
      pitch: cameraPitch,
      shape: {
        basePoints: base.shape.basePoints.map((p) => [p[0], p[1]] as Vec2),
        closed: base.shape.closed,
      },
      placement: {
        ...base.placement,
        anchor: [...base.placement.anchor] as Vec3,
        offsetTangent: [...base.placement.offsetTangent] as Vec2,
        rotationOffset: [...base.placement.rotationOffset] as Vec3,
        scale: [...base.placement.scale] as Vec2,
      },
    };
    commit((m) => ({
      ...m,
      parts: m.parts.map((p) =>
        p.id === partId
          ? { ...p, viewKeyframes: [...p.viewKeyframes, newKf] }
          : p,
      ),
    }));
    // Switch the editor to the newly created keyframe.
    if (selectedPartId === partId) setEditingKfIndex(part.viewKeyframes.length);
  };

  const removeViewKeyframe = (partId: string, kfIndex: number) => {
    const part = model.parts.find((p) => p.id === partId);
    if (!part || part.viewKeyframes.length <= 1) return; // keep at least one
    commit((m) => ({
      ...m,
      parts: m.parts.map((p) =>
        p.id === partId
          ? {
              ...p,
              viewKeyframes: p.viewKeyframes.filter((_, i) => i !== kfIndex),
            }
          : p,
      ),
    }));
    if (selectedPartId === partId && editingKfIndex >= kfIndex) {
      setEditingKfIndex(Math.max(0, editingKfIndex - 1));
    }
  };

  // ===== JSON IO =====
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
      if (parsed && parsed.version === 3) commit(parsed);
    } catch {
      // ignore malformed input
    }
  };

  const resetModel = () => {
    if (confirm("デフォルトモデルにリセットしますか?")) {
      commit(buildDefaultFaceModel());
      setSelectedPartId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-80 shrink-0 overflow-y-auto border-r bg-white p-4 text-sm">
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <span className="text-gray-500 text-xs">
            視点 yaw {cameraYaw.toFixed(1)}° / pitch {cameraPitch.toFixed(1)}°
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs hover:bg-gray-200 disabled:opacity-40"
              aria-label="Undo"
            >
              ↶
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs hover:bg-gray-200 disabled:opacity-40"
              aria-label="Redo"
            >
              ↷
            </button>
          </div>
        </div>

        <h2 className="mb-2 font-bold">頭メッシュ</h2>
        <div className="mb-4 space-y-2">
          <label className="block">
            <span className="block text-gray-600 text-xs">塗り色</span>
            <input
              type="color"
              value={model.head.fillColor}
              onChange={(e) =>
                commit((m) => ({
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
                  commit((m) => ({
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
                    commit((m) => ({
                      ...m,
                      head: {
                        ...m.head,
                        outline: { ...m.head.outline, color: e.target.value },
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
                    commit((m) => ({
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
                commit((m) => ({
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
                commit((m) => ({
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
          <PartEditor
            part={selectedPart}
            updatePart={updatePart}
            editingKfIndex={editingKfIndex}
            setEditingKfIndex={setEditingKfIndex}
            editingAnimKfIndex={editingAnimKfIndex}
            setEditingAnimKfIndex={setEditingAnimKfIndex}
            cameraYaw={cameraYaw}
            cameraPitch={cameraPitch}
            animDefs={model.animParams}
            currentAnimParams={model.currentAnimParams}
            onAddKfAtCamera={() => addViewKeyframeAtCamera(selectedPart.id)}
            onRemoveKf={(idx) => removeViewKeyframe(selectedPart.id, idx)}
          />
        )}

        <div className="mt-4 border-t pt-4">
          <AnimParamsPanel
            defs={model.animParams}
            current={model.currentAnimParams}
            commit={commit}
          />
        </div>

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
        <Scene
          model={model}
          showAxes={showAxes}
          showGrid={showGrid}
          onCameraChange={(y, p) => {
            setCameraYaw(y);
            setCameraPitch(p);
          }}
        />
      </main>
    </div>
  );
};

interface PartEditorProps {
  part: Part;
  updatePart: (id: string, mut: (p: Part) => Part) => void;
  editingKfIndex: number;
  setEditingKfIndex: (i: number) => void;
  editingAnimKfIndex: number;
  setEditingAnimKfIndex: (i: number) => void;
  cameraYaw: number;
  cameraPitch: number;
  animDefs: FaceModel["animParams"];
  currentAnimParams: FaceModel["currentAnimParams"];
  onAddKfAtCamera: () => void;
  onRemoveKf: (idx: number) => void;
}

const PartEditor = ({
  part,
  updatePart,
  editingKfIndex,
  setEditingKfIndex,
  editingAnimKfIndex,
  setEditingAnimKfIndex,
  cameraYaw,
  cameraPitch,
  animDefs,
  currentAnimParams,
  onAddKfAtCamera,
  onRemoveKf,
}: PartEditorProps) => {
  const safeIdx = Math.min(editingKfIndex, part.viewKeyframes.length - 1);
  const kf = part.viewKeyframes[safeIdx];

  const updateKf = (mut: (k: ViewKeyframe) => ViewKeyframe) => {
    updatePart(part.id, (p) => ({
      ...p,
      viewKeyframes: p.viewKeyframes.map((k, i) =>
        i === safeIdx ? mut(k) : k,
      ),
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
      <label className="block">
        <span className="block text-gray-600">view RBF σ (deg)</span>
        <input
          type="number"
          step={1}
          min={1}
          value={part.rbfSigmaView}
          onChange={(e) =>
            updatePart(part.id, (p) => ({
              ...p,
              rbfSigmaView: Number(e.target.value),
            }))
          }
          className="w-20 rounded border px-1"
        />
      </label>

      <fieldset className="rounded border bg-white p-2">
        <legend className="font-bold text-gray-700">
          view keyframes ({part.viewKeyframes.length})
        </legend>
        <button
          type="button"
          onClick={onAddKfAtCamera}
          className="mb-1 rounded bg-emerald-500 px-2 py-0.5 text-white text-xs hover:bg-emerald-600"
        >
          + 現在の視点 ({cameraYaw.toFixed(1)}°, {cameraPitch.toFixed(1)}°)
        </button>
        <ul className="space-y-0.5">
          {part.viewKeyframes.map((k, i) => (
            <li key={k.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditingKfIndex(i)}
                className={`flex-1 rounded px-1 py-0.5 text-left ${
                  i === safeIdx
                    ? "bg-blue-100 text-blue-800"
                    : "hover:bg-gray-100"
                }`}
              >
                yaw {k.yaw.toFixed(1)}° pitch {k.pitch.toFixed(1)}°
              </button>
              <button
                type="button"
                onClick={() => onRemoveKf(i)}
                disabled={part.viewKeyframes.length <= 1}
                className="px-1 text-red-500 hover:text-red-700 disabled:opacity-30"
                aria-label={`view keyframe ${i} を削除`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <ViewKeyframeFields kf={kf} updateKf={updateKf} />

      <AnimKeyframeEditor
        part={part}
        defs={animDefs}
        current={currentAnimParams}
        updatePart={updatePart}
        editingIndex={editingAnimKfIndex}
        setEditingIndex={setEditingAnimKfIndex}
      />
    </div>
  );
};

const ViewKeyframeFields = ({
  kf,
  updateKf,
}: {
  kf: ViewKeyframe;
  updateKf: (mut: (k: ViewKeyframe) => ViewKeyframe) => void;
}) => {
  return (
    <>
      <fieldset>
        <legend className="text-gray-600">
          keyframe (yaw, pitch) {kf.yaw.toFixed(1)}° / {kf.pitch.toFixed(1)}°
        </legend>
        <div className="flex gap-1">
          <input
            aria-label="keyframe yaw"
            type="number"
            step={1}
            value={kf.yaw}
            onChange={(e) =>
              updateKf((k) => ({ ...k, yaw: Number(e.target.value) }))
            }
            className="w-20 rounded border px-1"
          />
          <input
            aria-label="keyframe pitch"
            type="number"
            step={1}
            value={kf.pitch}
            onChange={(e) =>
              updateKf((k) => ({ ...k, pitch: Number(e.target.value) }))
            }
            className="w-20 rounded border px-1"
          />
        </div>
      </fieldset>
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
      <fieldset>
        <legend className="text-gray-600">
          形状 ({kf.shape.basePoints.length} 点)
        </legend>
        <PointEditor
          shape={kf.shape}
          onChange={(nextShape: PartShape) =>
            updateKf((k) => ({ ...k, shape: nextShape }))
          }
        />
        <p className="mt-1 text-gray-500">
          ハンドルをドラッグ / 線をクリックで点追加 / 右クリックで削除
        </p>
      </fieldset>
      <details>
        <summary className="cursor-pointer text-gray-600">
          座標を数値で編集 ({kf.shape.basePoints.length})
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
    </>
  );
};
