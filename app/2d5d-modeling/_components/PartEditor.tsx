"use client";

import { AFFINE_IDENTITY, type AffineMatrix } from "../_lib/affine";
import type { Part, PartViewKeyframe } from "../_lib/types";
import { AffineFields } from "./AffineFields";
import { KeyframeList } from "./KeyframeList";

interface Props {
  part: Part;
  updatePart: (id: string, mut: (p: Part) => Part) => void;
  editingKfIndex: number;
  setEditingKfIndex: (i: number) => void;
  cameraYaw: number;
  cameraPitch: number;
}

export const PartEditor = ({
  part,
  updatePart,
  editingKfIndex,
  setEditingKfIndex,
  cameraYaw,
  cameraPitch,
}: Props) => {
  const safeIdx = Math.min(editingKfIndex, part.viewKeyframes.length - 1);
  const kf = part.viewKeyframes[safeIdx];

  const updateKf = (mut: (k: PartViewKeyframe) => PartViewKeyframe) => {
    updatePart(part.id, (p) => ({
      ...p,
      viewKeyframes: p.viewKeyframes.map((k, i) =>
        i === safeIdx ? mut(k) : k,
      ),
    }));
  };

  const addKfAtCamera = () => {
    const base = part.viewKeyframes[safeIdx];
    const newKf: PartViewKeyframe = {
      ...base,
      id: `vk-${Date.now()}`,
      yaw: cameraYaw,
      pitch: cameraPitch,
      shape: {
        basePoints: base.shape.basePoints.map(
          (pt) => [pt[0], pt[1]] as [number, number],
        ),
        closed: base.shape.closed,
      },
      affine: [...base.affine] as AffineMatrix,
    };
    updatePart(part.id, (p) => ({
      ...p,
      viewKeyframes: [...p.viewKeyframes, newKf],
    }));
    setEditingKfIndex(part.viewKeyframes.length);
  };

  const removeKf = (idx: number) => {
    if (part.viewKeyframes.length <= 1) return;
    updatePart(part.id, (p) => ({
      ...p,
      viewKeyframes: p.viewKeyframes.filter((_, i) => i !== idx),
    }));
    if (editingKfIndex >= idx) {
      setEditingKfIndex(Math.max(0, editingKfIndex - 1));
    }
  };

  return (
    <div className="space-y-2 rounded border bg-gray-50 p-2 text-xs">
      <h3 className="font-bold text-sm">パーツ編集</h3>
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

      <KeyframeList
        title="view keyframes"
        keyframes={part.viewKeyframes}
        selectedIndex={safeIdx}
        setSelectedIndex={setEditingKfIndex}
        onAddAtCamera={addKfAtCamera}
        onRemove={removeKf}
        cameraYaw={cameraYaw}
        cameraPitch={cameraPitch}
      />

      <fieldset className="rounded border bg-white p-2">
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

      <AffineFields
        // Re-mount on keyframe switch so the AffineFields' local "params"
        // state resets to identity (the editor is a recomposing widget,
        // not a decomposing one — see AffineFields.tsx).
        key={kf.id}
        affine={kf.affine}
        onCommit={(next) => updateKf((k) => ({ ...k, affine: next }))}
      />

      <button
        type="button"
        onClick={() =>
          updateKf((k) => ({
            ...k,
            affine: [...AFFINE_IDENTITY] as AffineMatrix,
          }))
        }
        className="rounded bg-gray-200 px-2 py-0.5 text-[10px] hover:bg-gray-300"
      >
        affine を identity に戻す
      </button>

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
    </div>
  );
};
