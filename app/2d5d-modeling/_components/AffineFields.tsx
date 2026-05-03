"use client";

import { useState } from "react";
import {
  AFFINE_PARAMS_IDENTITY,
  type AffineMatrix,
  type AffineParams,
  composeAffineFromParams,
} from "../_lib/affine";

interface Props {
  // The current value of the keyframe's affine. Read-only here — the editor
  // composes scale/rotation/shear/translate (starting from identity) and
  // overwrites this value via onCommit.
  affine: AffineMatrix;
  onCommit: (next: AffineMatrix) => void;
}

// Edits an affine via four semantic groups of fields. The fields are *not*
// decomposed from the current affine (decomposition isn't unique once shear
// is in play); instead every commit recomposes from identity. This keeps
// behavior predictable: "set scale to (2, 1) + rotate 15°" produces exactly
// that, regardless of whatever was in the matrix before.
export const AffineFields = ({ affine, onCommit }: Props) => {
  const [params, setParams] = useState<AffineParams>(AFFINE_PARAMS_IDENTITY);
  const update = (mut: (p: AffineParams) => AffineParams) => {
    const next = mut(params);
    setParams(next);
    onCommit(composeAffineFromParams(next));
  };

  const reset = () => {
    setParams(AFFINE_PARAMS_IDENTITY);
    onCommit(composeAffineFromParams(AFFINE_PARAMS_IDENTITY));
  };

  return (
    <fieldset className="rounded border bg-white p-2">
      <legend className="text-gray-700">アフィン編集 (identity 起点)</legend>
      <p className="mb-1 text-[10px] text-gray-500">
        現在の行列を identity から再合成します
      </p>
      <div className="space-y-1 text-xs">
        <div>
          <span className="text-gray-600">scale (sx, sy)</span>
          <div className="flex gap-1">
            {(["x", "y"] as const).map((axis, i) => (
              <input
                key={axis}
                aria-label={`scale ${axis}`}
                type="number"
                step={0.05}
                value={params.scale[i]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  update((p) => ({
                    ...p,
                    scale: i === 0 ? [v, p.scale[1]] : [p.scale[0], v],
                  }));
                }}
                className="w-16 rounded border px-1"
              />
            ))}
          </div>
        </div>
        <div>
          <span className="text-gray-600">rotation (deg)</span>
          <input
            aria-label="rotation"
            type="number"
            step={1}
            value={params.rotation}
            onChange={(e) => {
              const v = Number(e.target.value);
              update((p) => ({ ...p, rotation: v }));
            }}
            className="w-20 rounded border px-1"
          />
        </div>
        <div>
          <span className="text-gray-600">shear (shx, shy)</span>
          <div className="flex gap-1">
            {(["x", "y"] as const).map((axis, i) => (
              <input
                key={axis}
                aria-label={`shear ${axis}`}
                type="number"
                step={0.05}
                value={params.shear[i]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  update((p) => ({
                    ...p,
                    shear: i === 0 ? [v, p.shear[1]] : [p.shear[0], v],
                  }));
                }}
                className="w-16 rounded border px-1"
              />
            ))}
          </div>
        </div>
        <div>
          <span className="text-gray-600">translate (tx, ty)</span>
          <div className="flex gap-1">
            {(["x", "y"] as const).map((axis, i) => (
              <input
                key={axis}
                aria-label={`translate ${axis}`}
                type="number"
                step={0.01}
                value={params.translate[i]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  update((p) => ({
                    ...p,
                    translate:
                      i === 0 ? [v, p.translate[1]] : [p.translate[0], v],
                  }));
                }}
                className="w-16 rounded border px-1"
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded bg-gray-200 px-2 py-0.5 text-[10px] hover:bg-gray-300"
        >
          identity に戻す
        </button>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-[10px] text-gray-500">
          現在の行列 [a, b, c, d, tx, ty]
        </summary>
        <div className="mt-1 grid grid-cols-3 gap-1 font-mono text-[10px]">
          {affine.map((v, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: column is its identity
            <span key={i}>{v.toFixed(3)}</span>
          ))}
        </div>
      </details>
    </fieldset>
  );
};
