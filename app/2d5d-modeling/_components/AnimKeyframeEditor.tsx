"use client";

import { buildEmptyAnimKeyframe } from "../_lib/animRbf";
import type {
  AnimKeyframe,
  AnimParamDef,
  Part,
  Vec2,
  Vec3,
} from "../_lib/types";

interface Props {
  part: Part;
  defs: AnimParamDef[];
  current: Record<string, number>;
  updatePart: (id: string, mut: (p: Part) => Part) => void;
  editingIndex: number;
  setEditingIndex: (i: number) => void;
}

// Editor for one part's animation keyframes. Each keyframe captures a point
// in N-dim paramValues space and a per-component delta to the view-resolved
// keyframe at that point. Phase 3 uses the registry sliders only — we don't
// have a "change one param value of an existing keyframe" UI past creation
// (which captures the current global animParams snapshot).
export const AnimKeyframeEditor = ({
  part,
  defs,
  current,
  updatePart,
  editingIndex,
  setEditingIndex,
}: Props) => {
  const safeIdx = Math.min(editingIndex, part.animKeyframes.length - 1);
  const kf = part.animKeyframes.length > 0 ? part.animKeyframes[safeIdx] : null;

  const addKeyframe = () => {
    const id = `ak-${Date.now()}`;
    const baseShapeLen = part.viewKeyframes[0].shape.basePoints.length;
    // Snapshot only the params that exist in the registry. Empty registry
    // would produce an always-active keyframe (paramValues={}), which is
    // legitimate but rarely useful, so guard.
    if (defs.length === 0) {
      alert("先にアニメパラメータを定義してください");
      return;
    }
    const snapshot: Record<string, number> = {};
    for (const d of defs) snapshot[d.name] = current[d.name] ?? d.default;
    const newKf = buildEmptyAnimKeyframe(id, snapshot, baseShapeLen);
    updatePart(part.id, (p) => ({
      ...p,
      animKeyframes: [...p.animKeyframes, newKf],
    }));
    setEditingIndex(part.animKeyframes.length);
  };

  const removeKeyframe = (idx: number) => {
    updatePart(part.id, (p) => ({
      ...p,
      animKeyframes: p.animKeyframes.filter((_, i) => i !== idx),
    }));
    if (editingIndex >= idx) {
      setEditingIndex(Math.max(0, editingIndex - 1));
    }
  };

  const updateKf = (mut: (k: AnimKeyframe) => AnimKeyframe) => {
    if (!kf) return;
    updatePart(part.id, (p) => ({
      ...p,
      animKeyframes: p.animKeyframes.map((k, i) =>
        i === safeIdx ? mut(k) : k,
      ),
    }));
  };

  const updateParamValue = (name: string, value: number) => {
    updateKf((k) => ({
      ...k,
      paramValues: { ...k.paramValues, [name]: value },
    }));
  };

  return (
    <fieldset className="rounded border bg-white p-2 text-xs">
      <legend className="font-bold text-gray-700">
        anim keyframes ({part.animKeyframes.length})
      </legend>
      <button
        type="button"
        onClick={addKeyframe}
        className="mb-1 rounded bg-emerald-500 px-2 py-0.5 text-white text-xs hover:bg-emerald-600"
      >
        + 現在の anim 値で追加
      </button>
      <ul className="mb-2 space-y-0.5">
        {part.animKeyframes.map((k, i) => {
          const label = Object.entries(k.paramValues)
            .map(([n, v]) => `${n}=${v.toFixed(2)}`)
            .join(" ");
          return (
            <li key={k.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditingIndex(i)}
                className={`flex-1 truncate rounded px-1 py-0.5 text-left ${
                  i === safeIdx
                    ? "bg-blue-100 text-blue-800"
                    : "hover:bg-gray-100"
                }`}
              >
                {label || "(empty)"}
              </button>
              <button
                type="button"
                onClick={() => removeKeyframe(i)}
                className="px-1 text-red-500 hover:text-red-700"
                aria-label={`anim keyframe ${i} を削除`}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      {kf && (
        <>
          <fieldset className="mb-1">
            <legend className="text-gray-600">paramValues</legend>
            {Object.keys(kf.paramValues).length === 0 ? (
              <p className="text-gray-500">(空)</p>
            ) : (
              <ul>
                {Object.entries(kf.paramValues).map(([name, v]) => (
                  <li key={name} className="flex items-center gap-1">
                    <span className="w-24 truncate font-mono">{name}</span>
                    <input
                      aria-label={`anim keyframe ${name}`}
                      type="number"
                      step={0.1}
                      value={v}
                      onChange={(e) =>
                        updateParamValue(name, Number(e.target.value))
                      }
                      className="w-20 rounded border px-1"
                    />
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          <DeltaFields kf={kf} updateKf={updateKf} />
        </>
      )}
    </fieldset>
  );
};

const DeltaFields = ({
  kf,
  updateKf,
}: {
  kf: AnimKeyframe;
  updateKf: (mut: (k: AnimKeyframe) => AnimKeyframe) => void;
}) => {
  const setAnchorDelta = (i: 0 | 1 | 2, value: number) => {
    updateKf((k) => {
      const next: Vec3 = [...k.placementDelta.anchorDelta] as Vec3;
      next[i] = value;
      return {
        ...k,
        placementDelta: { ...k.placementDelta, anchorDelta: next },
      };
    });
  };

  const setOffsetTangentDelta = (i: 0 | 1, value: number) => {
    updateKf((k) => {
      const next: Vec2 = [...k.placementDelta.offsetTangentDelta] as Vec2;
      next[i] = value;
      return {
        ...k,
        placementDelta: { ...k.placementDelta, offsetTangentDelta: next },
      };
    });
  };

  const setRotationDelta = (i: 0 | 1 | 2, value: number) => {
    updateKf((k) => {
      const next: Vec3 = [...k.placementDelta.rotationOffsetDelta] as Vec3;
      next[i] = value;
      return {
        ...k,
        placementDelta: { ...k.placementDelta, rotationOffsetDelta: next },
      };
    });
  };

  const setScaleDelta = (i: 0 | 1, value: number) => {
    updateKf((k) => {
      const next: Vec2 = [...k.placementDelta.scaleDelta] as Vec2;
      next[i] = value;
      return {
        ...k,
        placementDelta: { ...k.placementDelta, scaleDelta: next },
      };
    });
  };

  return (
    <details>
      <summary className="cursor-pointer text-gray-600">deltas</summary>
      <fieldset className="mt-1">
        <legend className="text-gray-500">anchorΔ</legend>
        <div className="flex gap-1">
          {(["x", "y", "z"] as const).map((axis, i) => (
            <input
              key={axis}
              aria-label={`anchor delta ${axis}`}
              type="number"
              step={0.05}
              value={kf.placementDelta.anchorDelta[i]}
              onChange={(e) =>
                setAnchorDelta(i as 0 | 1 | 2, Number(e.target.value))
              }
              className="w-16 rounded border px-1"
            />
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="block text-gray-500">offsetNormalΔ</span>
        <input
          type="number"
          step={0.005}
          value={kf.placementDelta.offsetNormalDelta}
          onChange={(e) =>
            updateKf((k) => ({
              ...k,
              placementDelta: {
                ...k.placementDelta,
                offsetNormalDelta: Number(e.target.value),
              },
            }))
          }
          className="w-20 rounded border px-1"
        />
      </label>
      <fieldset>
        <legend className="text-gray-500">offsetTangentΔ</legend>
        <div className="flex gap-1">
          {(["x", "y"] as const).map((axis, i) => (
            <input
              key={axis}
              aria-label={`offsetTangent delta ${axis}`}
              type="number"
              step={0.01}
              value={kf.placementDelta.offsetTangentDelta[i]}
              onChange={(e) =>
                setOffsetTangentDelta(i as 0 | 1, Number(e.target.value))
              }
              className="w-16 rounded border px-1"
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-gray-500">rotationOffsetΔ (deg)</legend>
        <div className="flex gap-1">
          {(["pitch", "yaw", "roll"] as const).map((axis, i) => (
            <input
              key={axis}
              aria-label={`rotation delta ${axis}`}
              type="number"
              step={1}
              value={kf.placementDelta.rotationOffsetDelta[i]}
              onChange={(e) =>
                setRotationDelta(i as 0 | 1 | 2, Number(e.target.value))
              }
              className="w-16 rounded border px-1"
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-gray-500">scaleΔ</legend>
        <div className="flex gap-1">
          {(["x", "y"] as const).map((axis, i) => (
            <input
              key={axis}
              aria-label={`scale delta ${axis}`}
              type="number"
              step={0.05}
              value={kf.placementDelta.scaleDelta[i]}
              onChange={(e) =>
                setScaleDelta(i as 0 | 1, Number(e.target.value))
              }
              className="w-16 rounded border px-1"
            />
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="block text-gray-500">alphaΔ</span>
        <input
          type="number"
          step={0.05}
          value={kf.alphaDelta}
          onChange={(e) =>
            updateKf((k) => ({ ...k, alphaDelta: Number(e.target.value) }))
          }
          className="w-20 rounded border px-1"
        />
      </label>
      <details>
        <summary className="cursor-pointer text-gray-500">
          shapeΔ ({kf.shapeDelta.length})
        </summary>
        <table className="mt-1 w-full">
          <thead>
            <tr className="text-gray-400">
              <th>Δx</th>
              <th>Δy</th>
            </tr>
          </thead>
          <tbody>
            {kf.shapeDelta.map((d, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: control-point index is its identity
              <tr key={i}>
                <td>
                  <input
                    aria-label={`shape delta ${i} x`}
                    type="number"
                    step={0.01}
                    value={d[0]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateKf((k) => ({
                        ...k,
                        shapeDelta: k.shapeDelta.map(
                          (q, idx) =>
                            (idx === i ? [v, q[1]] : q) as [number, number],
                        ),
                      }));
                    }}
                    className="w-16 rounded border px-1"
                  />
                </td>
                <td>
                  <input
                    aria-label={`shape delta ${i} y`}
                    type="number"
                    step={0.01}
                    value={d[1]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateKf((k) => ({
                        ...k,
                        shapeDelta: k.shapeDelta.map(
                          (q, idx) =>
                            (idx === i ? [q[0], v] : q) as [number, number],
                        ),
                      }));
                    }}
                    className="w-16 rounded border px-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </details>
  );
};
