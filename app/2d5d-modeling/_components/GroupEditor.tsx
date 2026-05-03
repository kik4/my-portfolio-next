"use client";

import { AFFINE_IDENTITY, type AffineMatrix } from "../_lib/affine";
import type {
  ChildGroup,
  ChildGroupViewKeyframe,
  Group,
  RootGroup,
  RootGroupViewKeyframe,
  Vec3,
} from "../_lib/types";
import { isRootGroup } from "../_lib/types";
import { AffineFields } from "./AffineFields";
import { KeyframeList } from "./KeyframeList";

interface Props {
  group: Group;
  updateGroup: (id: string, mut: (g: Group) => Group) => void;
  editingKfIndex: number;
  setEditingKfIndex: (i: number) => void;
  cameraYaw: number;
  cameraPitch: number;
  onSnapCamera?: (yaw: number, pitch: number) => void;
}

export const GroupEditor = (props: Props) => {
  // Branch on root vs child so the inner component can rely on a narrowed
  // type and access fields safely.
  return isRootGroup(props.group) ? (
    <RootGroupEditor {...props} group={props.group} />
  ) : (
    <ChildGroupEditor {...props} group={props.group} />
  );
};

// ===== Root group =====

const RootGroupEditor = ({
  group,
  updateGroup,
  editingKfIndex,
  setEditingKfIndex,
  cameraYaw,
  cameraPitch,
  onSnapCamera,
}: Props & { group: RootGroup }) => {
  const safeIdx = Math.min(editingKfIndex, group.viewKeyframes.length - 1);
  const kf = group.viewKeyframes[safeIdx];

  const updateKf = (
    mut: (k: RootGroupViewKeyframe) => RootGroupViewKeyframe,
  ) => {
    updateGroup(group.id, (g) => {
      if (!isRootGroup(g)) return g;
      return {
        ...g,
        viewKeyframes: g.viewKeyframes.map((k, i) =>
          i === safeIdx ? mut(k) : k,
        ),
      };
    });
  };

  const addKfAtCamera = () => {
    const base = group.viewKeyframes[safeIdx];
    const newKf: RootGroupViewKeyframe = {
      ...base,
      id: `gvk-${Date.now()}`,
      yaw: cameraYaw,
      pitch: cameraPitch,
      anchor: [...base.anchor] as Vec3,
      affine: [...base.affine] as AffineMatrix,
    };
    updateGroup(group.id, (g) =>
      isRootGroup(g) ? { ...g, viewKeyframes: [...g.viewKeyframes, newKf] } : g,
    );
    setEditingKfIndex(group.viewKeyframes.length);
  };

  const removeKf = (idx: number) => {
    if (group.viewKeyframes.length <= 1) return;
    updateGroup(group.id, (g) =>
      isRootGroup(g)
        ? {
            ...g,
            viewKeyframes: g.viewKeyframes.filter((_, i) => i !== idx),
          }
        : g,
    );
    if (editingKfIndex >= idx) {
      setEditingKfIndex(Math.max(0, editingKfIndex - 1));
    }
  };

  return (
    <div className="space-y-2 rounded border bg-amber-50 p-2 text-xs">
      <h3 className="font-bold text-sm">ルートグループ編集</h3>
      <CommonGroupHeader group={group} updateGroup={updateGroup} />

      <KeyframeList
        title="view keyframes"
        keyframes={group.viewKeyframes}
        selectedIndex={safeIdx}
        setSelectedIndex={setEditingKfIndex}
        onAddAtCamera={addKfAtCamera}
        onRemove={removeKf}
        onSnapCamera={onSnapCamera}
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

      <fieldset className="rounded border bg-white p-2">
        <legend className="text-gray-600">anchor (world, x/y/z)</legend>
        <div className="flex gap-1">
          {(["x", "y", "z"] as const).map((axis, i) => (
            <input
              key={axis}
              aria-label={`anchor ${axis}`}
              type="number"
              step={0.05}
              value={kf.anchor[i]}
              onChange={(e) => {
                const v = Number(e.target.value);
                updateKf((k) => {
                  const next: Vec3 = [...k.anchor] as Vec3;
                  next[i] = v;
                  return { ...k, anchor: next };
                });
              }}
              className="w-16 rounded border px-1"
            />
          ))}
        </div>
      </fieldset>

      <AffineFields
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

// ===== Child group =====

const ChildGroupEditor = ({
  group,
  updateGroup,
  editingKfIndex,
  setEditingKfIndex,
  cameraYaw,
  cameraPitch,
  onSnapCamera,
}: Props & { group: ChildGroup }) => {
  const safeIdx = Math.min(editingKfIndex, group.viewKeyframes.length - 1);
  const kf = group.viewKeyframes[safeIdx];

  const updateKf = (
    mut: (k: ChildGroupViewKeyframe) => ChildGroupViewKeyframe,
  ) => {
    updateGroup(group.id, (g) => {
      if (isRootGroup(g)) return g;
      return {
        ...g,
        viewKeyframes: g.viewKeyframes.map((k, i) =>
          i === safeIdx ? mut(k) : k,
        ),
      };
    });
  };

  const addKfAtCamera = () => {
    const base = group.viewKeyframes[safeIdx];
    const newKf: ChildGroupViewKeyframe = {
      ...base,
      id: `gvk-${Date.now()}`,
      yaw: cameraYaw,
      pitch: cameraPitch,
      affine: [...base.affine] as AffineMatrix,
    };
    updateGroup(group.id, (g) =>
      isRootGroup(g) ? g : { ...g, viewKeyframes: [...g.viewKeyframes, newKf] },
    );
    setEditingKfIndex(group.viewKeyframes.length);
  };

  const removeKf = (idx: number) => {
    if (group.viewKeyframes.length <= 1) return;
    updateGroup(group.id, (g) =>
      isRootGroup(g)
        ? g
        : {
            ...g,
            viewKeyframes: g.viewKeyframes.filter((_, i) => i !== idx),
          },
    );
    if (editingKfIndex >= idx) {
      setEditingKfIndex(Math.max(0, editingKfIndex - 1));
    }
  };

  return (
    <div className="space-y-2 rounded border bg-yellow-50 p-2 text-xs">
      <h3 className="font-bold text-sm">子グループ編集</h3>
      <CommonGroupHeader group={group} updateGroup={updateGroup} />

      <KeyframeList
        title="view keyframes"
        keyframes={group.viewKeyframes}
        selectedIndex={safeIdx}
        setSelectedIndex={setEditingKfIndex}
        onAddAtCamera={addKfAtCamera}
        onRemove={removeKf}
        onSnapCamera={onSnapCamera}
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

// ===== shared header =====

const CommonGroupHeader = ({
  group,
  updateGroup,
}: {
  group: Group;
  updateGroup: (id: string, mut: (g: Group) => Group) => void;
}) => (
  <>
    <label className="block">
      <span className="block text-gray-600">名前</span>
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
  </>
);
