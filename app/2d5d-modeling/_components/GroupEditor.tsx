"use client";

import { buildEmptyAnimKeyframe } from "../_lib/animRbf";
import type {
  AnimParamDef,
  GroupAnimKeyframe,
  GroupTransformDelta,
  GroupViewKeyframe,
  PartGroup,
  Vec2,
  Vec3,
} from "../_lib/types";

interface Props {
  group: PartGroup;
  updateGroup: (id: string, mut: (g: PartGroup) => PartGroup) => void;
  cameraYaw: number;
  cameraPitch: number;
  animDefs: AnimParamDef[];
  currentAnimParams: Record<string, number>;
  editingViewKfIndex: number;
  setEditingViewKfIndex: (i: number) => void;
  editingAnimKfIndex: number;
  setEditingAnimKfIndex: (i: number) => void;
  onSnapCamera: (yaw: number, pitch: number) => void;
}

// Sidebar editor for a selected group: name, visibility, view keyframes (one
// transformDelta per camera angle), and anim keyframes (delta layered on top
// for given paramValues). Mirrors PartEditor's structure but with only a
// transformDelta payload (no shape, no placement).
export const GroupEditor = ({
  group,
  updateGroup,
  cameraYaw,
  cameraPitch,
  animDefs,
  currentAnimParams,
  editingViewKfIndex,
  setEditingViewKfIndex,
  editingAnimKfIndex,
  setEditingAnimKfIndex,
  onSnapCamera,
}: Props) => {
  const safeViewIdx = Math.min(
    editingViewKfIndex,
    group.viewKeyframes.length - 1,
  );
  const viewKf = group.viewKeyframes[safeViewIdx];

  const updateViewKf = (mut: (k: GroupViewKeyframe) => GroupViewKeyframe) => {
    updateGroup(group.id, (g) => ({
      ...g,
      viewKeyframes: g.viewKeyframes.map((k, i) =>
        i === safeViewIdx ? mut(k) : k,
      ),
    }));
  };

  const addViewKfAtCamera = () => {
    const base = group.viewKeyframes[Math.max(safeViewIdx, 0)];
    const newKf: GroupViewKeyframe = {
      id: `gvk-${Date.now()}`,
      yaw: cameraYaw,
      pitch: cameraPitch,
      transformDelta: cloneDelta(base.transformDelta),
    };
    updateGroup(group.id, (g) => ({
      ...g,
      viewKeyframes: [...g.viewKeyframes, newKf],
    }));
    setEditingViewKfIndex(group.viewKeyframes.length);
  };

  const removeViewKf = (idx: number) => {
    if (group.viewKeyframes.length <= 1) return;
    updateGroup(group.id, (g) => ({
      ...g,
      viewKeyframes: g.viewKeyframes.filter((_, i) => i !== idx),
    }));
    if (editingViewKfIndex >= idx) {
      setEditingViewKfIndex(Math.max(0, editingViewKfIndex - 1));
    }
  };

  const safeAnimIdx = Math.min(
    editingAnimKfIndex,
    group.animKeyframes.length - 1,
  );
  const animKf =
    group.animKeyframes.length > 0 ? group.animKeyframes[safeAnimIdx] : null;

  const updateAnimKf = (mut: (k: GroupAnimKeyframe) => GroupAnimKeyframe) => {
    if (!animKf) return;
    updateGroup(group.id, (g) => ({
      ...g,
      animKeyframes: g.animKeyframes.map((k, i) =>
        i === safeAnimIdx ? mut(k) : k,
      ),
    }));
  };

  const addAnimKf = () => {
    if (animDefs.length === 0) {
      alert("先にアニメパラメータを定義してください");
      return;
    }
    const snapshot: Record<string, number> = {};
    for (const d of animDefs) {
      snapshot[d.name] = currentAnimParams[d.name] ?? d.default;
    }
    // We reuse buildEmptyAnimKeyframe for the paramValues+id and discard the
    // shape/placement deltas it returns (group anim doesn't need them).
    const filler = buildEmptyAnimKeyframe(`gak-${Date.now()}`, snapshot, 0);
    const newKf: GroupAnimKeyframe = {
      id: filler.id,
      paramValues: filler.paramValues,
      transformDelta: {
        anchorDelta: [0, 0, 0],
        rotationOffsetDelta: [0, 0, 0],
        scaleDelta: [0, 0],
      },
    };
    updateGroup(group.id, (g) => ({
      ...g,
      animKeyframes: [...g.animKeyframes, newKf],
    }));
    setEditingAnimKfIndex(group.animKeyframes.length);
  };

  const removeAnimKf = (idx: number) => {
    updateGroup(group.id, (g) => ({
      ...g,
      animKeyframes: g.animKeyframes.filter((_, i) => i !== idx),
    }));
    if (editingAnimKfIndex >= idx) {
      setEditingAnimKfIndex(Math.max(0, editingAnimKfIndex - 1));
    }
  };

  return (
    <div className="space-y-2 rounded border bg-amber-50 p-2 text-xs">
      <label className="block">
        <span className="block text-gray-600">グループ名</span>
        <input
          type="text"
          value={group.name}
          onChange={(e) =>
            updateGroup(group.id, (g) => ({ ...g, name: e.target.value }))
          }
          className="w-full rounded border px-1"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={group.visible}
          onChange={(e) =>
            updateGroup(group.id, (g) => ({ ...g, visible: e.target.checked }))
          }
        />
        表示
      </label>
      <label className="block">
        <span className="block text-gray-600">view RBF σ (deg)</span>
        <input
          type="number"
          step={1}
          min={1}
          value={group.rbfSigmaView}
          onChange={(e) =>
            updateGroup(group.id, (g) => ({
              ...g,
              rbfSigmaView: Number(e.target.value),
            }))
          }
          className="w-20 rounded border px-1"
        />
      </label>

      <fieldset className="rounded border bg-white p-2">
        <legend className="font-bold text-gray-700">
          view keyframes ({group.viewKeyframes.length})
        </legend>
        <button
          type="button"
          onClick={addViewKfAtCamera}
          className="mb-1 rounded bg-emerald-500 px-2 py-0.5 text-white text-xs hover:bg-emerald-600"
        >
          + 現在の視点 ({cameraYaw.toFixed(1)}°, {cameraPitch.toFixed(1)}°)
        </button>
        <ul className="space-y-0.5">
          {group.viewKeyframes.map((k, i) => (
            <li key={k.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditingViewKfIndex(i);
                  onSnapCamera(k.yaw, k.pitch);
                }}
                className={`flex-1 rounded px-1 py-0.5 text-left ${
                  i === safeViewIdx
                    ? "bg-blue-100 text-blue-800"
                    : "hover:bg-gray-100"
                }`}
              >
                yaw {k.yaw.toFixed(1)}° pitch {k.pitch.toFixed(1)}°
              </button>
              <button
                type="button"
                onClick={() => removeViewKf(i)}
                disabled={group.viewKeyframes.length <= 1}
                className="px-1 text-red-500 hover:text-red-700 disabled:opacity-30"
                aria-label={`view keyframe ${i} を削除`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <DeltaFields
        delta={viewKf.transformDelta}
        onChange={(d) => updateViewKf((k) => ({ ...k, transformDelta: d }))}
        labelPrefix="view"
      />

      <fieldset className="rounded border bg-white p-2">
        <legend className="font-bold text-gray-700">
          anim keyframes ({group.animKeyframes.length})
        </legend>
        <button
          type="button"
          onClick={addAnimKf}
          className="mb-1 rounded bg-emerald-500 px-2 py-0.5 text-white text-xs hover:bg-emerald-600"
        >
          + 現在の anim 値で追加
        </button>
        <ul className="mb-2 space-y-0.5">
          {group.animKeyframes.map((k, i) => {
            const label = Object.entries(k.paramValues)
              .map(([n, v]) => `${n}=${v.toFixed(2)}`)
              .join(" ");
            return (
              <li key={k.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingAnimKfIndex(i)}
                  className={`flex-1 truncate rounded px-1 py-0.5 text-left ${
                    i === safeAnimIdx
                      ? "bg-blue-100 text-blue-800"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {label || "(empty)"}
                </button>
                <button
                  type="button"
                  onClick={() => removeAnimKf(i)}
                  className="px-1 text-red-500 hover:text-red-700"
                  aria-label={`anim keyframe ${i} を削除`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
        {animKf && (
          <DeltaFields
            delta={animKf.transformDelta}
            onChange={(d) => updateAnimKf((k) => ({ ...k, transformDelta: d }))}
            labelPrefix="anim"
          />
        )}
      </fieldset>
    </div>
  );
};

const cloneDelta = (d: GroupTransformDelta): GroupTransformDelta => ({
  anchorDelta: [...d.anchorDelta] as Vec3,
  rotationOffsetDelta: [...d.rotationOffsetDelta] as Vec3,
  scaleDelta: [...d.scaleDelta] as Vec2,
});

interface DeltaFieldsProps {
  delta: GroupTransformDelta;
  onChange: (next: GroupTransformDelta) => void;
  labelPrefix: string;
}

const DeltaFields = ({ delta, onChange, labelPrefix }: DeltaFieldsProps) => {
  const setAxis = (
    field: keyof GroupTransformDelta,
    i: number,
    value: number,
  ) => {
    const next = cloneDelta(delta);
    (next[field] as number[])[i] = value;
    onChange(next);
  };
  return (
    <>
      <fieldset>
        <legend className="text-gray-600">anchorΔ (x, y, z)</legend>
        <div className="flex gap-1">
          {(["x", "y", "z"] as const).map((axis, i) => (
            <input
              key={axis}
              aria-label={`${labelPrefix} anchor delta ${axis}`}
              type="number"
              step={0.05}
              value={delta.anchorDelta[i]}
              onChange={(e) =>
                setAxis("anchorDelta", i, Number(e.target.value))
              }
              className="w-16 rounded border px-1"
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-gray-600">
          rotationΔ (pitch, yaw, roll deg)
        </legend>
        <div className="flex gap-1">
          {(["pitch", "yaw", "roll"] as const).map((axis, i) => (
            <input
              key={axis}
              aria-label={`${labelPrefix} rotation delta ${axis}`}
              type="number"
              step={1}
              value={delta.rotationOffsetDelta[i]}
              onChange={(e) =>
                setAxis("rotationOffsetDelta", i, Number(e.target.value))
              }
              className="w-16 rounded border px-1"
            />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-gray-600">scaleΔ (x, y) — 0 = 等倍</legend>
        <div className="flex gap-1">
          {(["x", "y"] as const).map((axis, i) => (
            <input
              key={axis}
              aria-label={`${labelPrefix} scale delta ${axis}`}
              type="number"
              step={0.05}
              value={delta.scaleDelta[i]}
              onChange={(e) => setAxis("scaleDelta", i, Number(e.target.value))}
              className="w-16 rounded border px-1"
            />
          ))}
        </div>
      </fieldset>
    </>
  );
};
