"use client";

import type { Group, Part } from "../_lib/types";

interface PartProps {
  kind: "part";
  part: Part;
  onChange: (next: Part) => void;
}

interface GroupProps {
  kind: "group";
  group: Group;
  onChange: (next: Group) => void;
}

type Props = PartProps | GroupProps;

// Editor for the currently active part or group. Property edits go through
// `onChange` which the parent commits as a single history entry per change.
// Color/text inputs do fire many onChange events while dragging — that's
// acceptable for now; if it becomes a problem we can switch to onBlur or
// debounce.
export const NodeEditor = (props: Props) => {
  if (props.kind === "group") {
    const { group, onChange } = props;
    return (
      <div className="space-y-2">
        <label className="block">
          <span className="block text-[11px] text-gray-600">名前</span>
          <input
            type="text"
            value={group.name}
            onChange={(e) => onChange({ ...group, name: e.target.value })}
            className="w-full rounded border bg-white px-1 py-0.5 text-xs"
          />
        </label>
        <p className="text-[10px] text-gray-500">
          メッシュ数: {0 /* parts under this group are counted by parent */}
        </p>
      </div>
    );
  }
  const { part, onChange } = props;
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="block text-[11px] text-gray-600">名前</span>
        <input
          type="text"
          value={part.name}
          onChange={(e) => onChange({ ...part, name: e.target.value })}
          className="w-full rounded border bg-white px-1 py-0.5 text-xs"
        />
      </label>
      <label className="block">
        <span className="block text-[11px] text-gray-600">塗り色</span>
        <input
          type="color"
          value={part.fillColor}
          onChange={(e) => onChange({ ...part, fillColor: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="block text-[11px] text-gray-600">線色</span>
        <input
          type="color"
          value={part.strokeColor}
          onChange={(e) => onChange({ ...part, strokeColor: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="block text-[11px] text-gray-600">
          線幅 (px) — 多くのブラウザで 1 に丸められる点に注意
        </span>
        <input
          type="number"
          min={1}
          max={20}
          step={1}
          value={part.strokeWidth}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v > 0)
              onChange({ ...part, strokeWidth: v });
          }}
          className="w-20 rounded border bg-white px-1 py-0.5 text-xs"
        />
      </label>
      <p className="text-[10px] text-gray-500">
        点 {part.mesh.points.length} / 辺 {part.mesh.edges.length} / 面{" "}
        {part.mesh.faces.length}
      </p>
    </div>
  );
};
