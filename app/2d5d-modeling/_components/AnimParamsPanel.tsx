"use client";

import type { AnimParamDef, FaceModel } from "../_lib/types";

interface Props {
  defs: AnimParamDef[];
  current: Record<string, number>;
  // Commits a model mutation through the history stack.
  commit: (next: FaceModel | ((prev: FaceModel) => FaceModel)) => void;
}

// Two responsibilities:
//   1. Manage the animParams registry: list, add, remove, edit range/default.
//   2. Show sliders for currentAnimParams so the user can preview the effect
//      of anim keyframes interactively.
// Both are stored on FaceModel and edits flow through the history-aware
// commit() function so they can be undone.
export const AnimParamsPanel = ({ defs, current, commit }: Props) => {
  const addParam = () => {
    const name = prompt("パラメータ名 (例: mouthOpen)");
    if (!name) return;
    if (defs.some((d) => d.name === name)) {
      alert("既に存在します");
      return;
    }
    commit((m) => ({
      ...m,
      animParams: [...m.animParams, { name, range: [0, 1], default: 0 }],
      currentAnimParams: { ...m.currentAnimParams, [name]: 0 },
    }));
  };

  const removeParam = (name: string) => {
    commit((m) => {
      const nextCurrent = { ...m.currentAnimParams };
      delete nextCurrent[name];
      return {
        ...m,
        animParams: m.animParams.filter((d) => d.name !== name),
        currentAnimParams: nextCurrent,
      };
    });
  };

  const updateRange = (name: string, idx: 0 | 1, value: number) => {
    commit((m) => ({
      ...m,
      animParams: m.animParams.map((d) =>
        d.name === name
          ? {
              ...d,
              range: idx === 0 ? [value, d.range[1]] : [d.range[0], value],
            }
          : d,
      ),
    }));
  };

  const updateDefault = (name: string, value: number) => {
    commit((m) => ({
      ...m,
      animParams: m.animParams.map((d) =>
        d.name === name ? { ...d, default: value } : d,
      ),
    }));
  };

  const updateCurrent = (name: string, value: number) => {
    commit((m) => ({
      ...m,
      currentAnimParams: { ...m.currentAnimParams, [name]: value },
    }));
  };

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold">アニメパラメータ</h2>
        <button
          type="button"
          onClick={addParam}
          className="rounded bg-blue-500 px-2 py-0.5 text-white text-xs hover:bg-blue-600"
        >
          + 追加
        </button>
      </div>
      {defs.length === 0 ? (
        <p className="text-gray-500 text-xs">
          (まだパラメータが定義されていません)
        </p>
      ) : (
        <ul className="space-y-2">
          {defs.map((d) => {
            const value = current[d.name] ?? d.default;
            return (
              <li key={d.name} className="rounded border bg-white p-2 text-xs">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-mono">{d.name}</span>
                  <button
                    type="button"
                    onClick={() => removeParam(d.name)}
                    className="text-red-500 hover:text-red-700"
                    aria-label={`${d.name} を削除`}
                  >
                    ×
                  </button>
                </div>
                <div className="mb-1 flex items-center gap-1">
                  <input
                    aria-label={`${d.name} min`}
                    type="number"
                    step={0.1}
                    value={d.range[0]}
                    onChange={(e) =>
                      updateRange(d.name, 0, Number(e.target.value))
                    }
                    className="w-14 rounded border px-1"
                  />
                  <input
                    type="range"
                    min={d.range[0]}
                    max={d.range[1]}
                    step={(d.range[1] - d.range[0]) / 100 || 0.01}
                    value={value}
                    onChange={(e) =>
                      updateCurrent(d.name, Number(e.target.value))
                    }
                    aria-label={`${d.name} value`}
                    className="flex-1"
                  />
                  <input
                    aria-label={`${d.name} max`}
                    type="number"
                    step={0.1}
                    value={d.range[1]}
                    onChange={(e) =>
                      updateRange(d.name, 1, Number(e.target.value))
                    }
                    className="w-14 rounded border px-1"
                  />
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <span>= {value.toFixed(3)}</span>
                  <label className="ml-auto flex items-center gap-1">
                    default
                    <input
                      type="number"
                      step={0.1}
                      value={d.default}
                      onChange={(e) =>
                        updateDefault(d.name, Number(e.target.value))
                      }
                      className="w-14 rounded border px-1"
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
