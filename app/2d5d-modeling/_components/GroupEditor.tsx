"use client";

import type { PartGroup, Vec2, Vec3 } from "../_lib/types";

interface Props {
  group: PartGroup;
  updateGroup: (id: string, mut: (g: PartGroup) => PartGroup) => void;
}

// Sidebar editor for a selected group: name, visibility, and the static
// transform delta (anchorDelta, rotationOffsetDelta, scaleDelta) applied to
// every descendant part.
export const GroupEditor = ({ group, updateGroup }: Props) => {
  const setAnchorDelta = (i: 0 | 1 | 2, v: number) => {
    updateGroup(group.id, (g) => {
      const next: Vec3 = [...g.transformDelta.anchorDelta] as Vec3;
      next[i] = v;
      return {
        ...g,
        transformDelta: { ...g.transformDelta, anchorDelta: next },
      };
    });
  };
  const setRotationDelta = (i: 0 | 1 | 2, v: number) => {
    updateGroup(group.id, (g) => {
      const next: Vec3 = [...g.transformDelta.rotationOffsetDelta] as Vec3;
      next[i] = v;
      return {
        ...g,
        transformDelta: { ...g.transformDelta, rotationOffsetDelta: next },
      };
    });
  };
  const setScaleDelta = (i: 0 | 1, v: number) => {
    updateGroup(group.id, (g) => {
      const next: Vec2 = [...g.transformDelta.scaleDelta] as Vec2;
      next[i] = v;
      return {
        ...g,
        transformDelta: { ...g.transformDelta, scaleDelta: next },
      };
    });
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
      <fieldset>
        <legend className="text-gray-600">anchorΔ (x, y, z)</legend>
        <div className="flex gap-1">
          {(["x", "y", "z"] as const).map((axis, i) => (
            <input
              key={axis}
              aria-label={`group anchor delta ${axis}`}
              type="number"
              step={0.05}
              value={group.transformDelta.anchorDelta[i]}
              onChange={(e) =>
                setAnchorDelta(i as 0 | 1 | 2, Number(e.target.value))
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
              aria-label={`group rotation delta ${axis}`}
              type="number"
              step={1}
              value={group.transformDelta.rotationOffsetDelta[i]}
              onChange={(e) =>
                setRotationDelta(i as 0 | 1 | 2, Number(e.target.value))
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
              aria-label={`group scale delta ${axis}`}
              type="number"
              step={0.05}
              value={group.transformDelta.scaleDelta[i]}
              onChange={(e) =>
                setScaleDelta(i as 0 | 1, Number(e.target.value))
              }
              className="w-16 rounded border px-1"
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
};
