"use client";

import { useState } from "react";
import type { Group, Part } from "../_lib/types";

export type Selection =
  | { kind: "part"; id: string }
  | { kind: "group"; id: string }
  | null;

// What's currently being dragged. We carry this in component state instead
// of round-tripping it through the DataTransfer payload because the latter
// is unreadable during dragover (browsers only expose it on drop), but we
// want to highlight valid drop targets while the cursor moves.
type DragSource =
  | { kind: "part"; id: string }
  | { kind: "group"; id: string }
  | null;

interface Props {
  groups: Group[];
  parts: Part[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  onAddRootGroup: () => void;
  onAddChildGroup: (parentId: string) => void;
  onAddPart: (groupId: string) => void;
  onRemoveGroup: (id: string) => void;
  onRemovePart: (id: string) => void;
  onReparentGroup: (id: string, newParentId: string) => void;
  onReparentPart: (id: string, newGroupId: string) => void;
}

export const PartTree = ({
  groups,
  parts,
  selection,
  onSelect,
  onAddRootGroup,
  onAddChildGroup,
  onAddPart,
  onRemoveGroup,
  onRemovePart,
  onReparentGroup,
  onReparentPart,
}: Props) => {
  const [dragSource, setDragSource] = useState<DragSource>(null);
  const roots = groups.filter((g) => g.parentId === null);
  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onAddRootGroup}
          className="rounded bg-amber-500 px-2 py-0.5 text-white hover:bg-amber-600"
        >
          + ルートグループ
        </button>
      </div>
      <p className="text-[10px] text-gray-500">
        ドラッグでグループへ移動 (ルートグループは移動不可)
      </p>
      <ul className="space-y-1">
        {roots.map((g) => (
          <GroupNode
            key={g.id}
            group={g}
            depth={0}
            groups={groups}
            parts={parts}
            selection={selection}
            onSelect={onSelect}
            onAddChildGroup={onAddChildGroup}
            onAddPart={onAddPart}
            onRemoveGroup={onRemoveGroup}
            onRemovePart={onRemovePart}
            onReparentGroup={onReparentGroup}
            onReparentPart={onReparentPart}
            dragSource={dragSource}
            setDragSource={setDragSource}
          />
        ))}
      </ul>
    </div>
  );
};

interface GroupNodeProps {
  group: Group;
  depth: number;
  groups: Group[];
  parts: Part[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  onAddChildGroup: (parentId: string) => void;
  onAddPart: (groupId: string) => void;
  onRemoveGroup: (id: string) => void;
  onRemovePart: (id: string) => void;
  onReparentGroup: (id: string, newParentId: string) => void;
  onReparentPart: (id: string, newGroupId: string) => void;
  dragSource: DragSource;
  setDragSource: (s: DragSource) => void;
}

const GroupNode = ({
  group,
  depth,
  groups,
  parts,
  selection,
  onSelect,
  onAddChildGroup,
  onAddPart,
  onRemoveGroup,
  onRemovePart,
  onReparentGroup,
  onReparentPart,
  dragSource,
  setDragSource,
}: GroupNodeProps) => {
  const [hover, setHover] = useState(false);
  const childGroups = groups.filter((g) => g.parentId === group.id);
  const childParts = parts.filter((p) => p.groupId === group.id);
  const isSelected = selection?.kind === "group" && selection.id === group.id;
  const isRoot = group.parentId === null;

  // Whether dropping the current drag source onto this group is meaningful.
  // - Parts are always droppable onto any group (including root).
  // - Child groups can be dropped onto any group except themselves and
  //   their own descendants (cycle); the parent must run wouldCreateCycle
  //   on commit anyway, but we hide the highlight here too.
  const canAcceptDrop = (() => {
    if (!dragSource) return false;
    if (dragSource.kind === "part") return true;
    if (dragSource.kind === "group") {
      if (dragSource.id === group.id) return false;
      // Walk up from this group; if we ever hit dragSource.id, dropping
      // would create a cycle (the source is an ancestor of this group).
      let cursor: string | null = group.id;
      const byId = new Map(groups.map((g) => [g.id, g]));
      while (cursor) {
        if (cursor === dragSource.id) return false;
        const cur = byId.get(cursor);
        cursor = cur ? cur.parentId : null;
      }
      return true;
    }
    return false;
  })();

  const onDragStart = (e: React.DragEvent) => {
    if (isRoot) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    // Set some payload so Firefox actually starts the drag.
    e.dataTransfer.setData("text/plain", `group:${group.id}`);
    setDragSource({ kind: "group", id: group.id });
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!canAcceptDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!hover) setHover(true);
  };

  const onDragLeave = () => {
    if (hover) setHover(false);
  };

  const onDrop = (e: React.DragEvent) => {
    if (!canAcceptDrop || !dragSource) return;
    e.preventDefault();
    setHover(false);
    if (dragSource.kind === "part") {
      onReparentPart(dragSource.id, group.id);
    } else {
      onReparentGroup(dragSource.id, group.id);
    }
    setDragSource(null);
  };

  return (
    <li>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: tree row needs DnD wiring; keyboard a11y is provided by inner buttons */}
      <div
        style={{ paddingLeft: depth * 12 }}
        draggable={!isRoot}
        onDragStart={onDragStart}
        onDragEnd={() => setDragSource(null)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex items-center gap-1 rounded ${
          isSelected ? "bg-blue-100" : ""
        } ${hover && canAcceptDrop ? "ring-2 ring-blue-400" : "hover:bg-gray-100"}`}
      >
        <button
          type="button"
          onClick={() => onSelect({ kind: "group", id: group.id })}
          className="flex-1 truncate text-left"
        >
          <span className="text-gray-500">{isRoot ? "◆" : "◇"}</span>{" "}
          {group.name}
        </button>
        <button
          type="button"
          onClick={() => onAddPart(group.id)}
          className="px-1 text-blue-600 hover:text-blue-800"
          aria-label={`${group.name} にパーツ追加`}
          title="パーツ追加"
        >
          +P
        </button>
        <button
          type="button"
          onClick={() => onAddChildGroup(group.id)}
          className="px-1 text-amber-600 hover:text-amber-800"
          aria-label={`${group.name} に子グループ追加`}
          title="子グループ追加"
        >
          +G
        </button>
        <button
          type="button"
          onClick={() => onRemoveGroup(group.id)}
          className="px-1 text-red-500 hover:text-red-700"
          aria-label={`${group.name} を削除`}
          title="削除"
        >
          ×
        </button>
      </div>
      {(childGroups.length > 0 || childParts.length > 0) && (
        <ul className="mt-0.5 space-y-0.5">
          {childGroups.map((cg) => (
            <GroupNode
              key={cg.id}
              group={cg}
              depth={depth + 1}
              groups={groups}
              parts={parts}
              selection={selection}
              onSelect={onSelect}
              onAddChildGroup={onAddChildGroup}
              onAddPart={onAddPart}
              onRemoveGroup={onRemoveGroup}
              onRemovePart={onRemovePart}
              onReparentGroup={onReparentGroup}
              onReparentPart={onReparentPart}
              dragSource={dragSource}
              setDragSource={setDragSource}
            />
          ))}
          {childParts.map((p) => (
            <PartNode
              key={p.id}
              part={p}
              depth={depth + 1}
              selection={selection}
              onSelect={onSelect}
              onRemovePart={onRemovePart}
              setDragSource={setDragSource}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

interface PartNodeProps {
  part: Part;
  depth: number;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onRemovePart: (id: string) => void;
  setDragSource: (s: DragSource) => void;
}

const PartNode = ({
  part,
  depth,
  selection,
  onSelect,
  onRemovePart,
  setDragSource,
}: PartNodeProps) => {
  const isSelected = selection?.kind === "part" && selection.id === part.id;

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `part:${part.id}`);
    setDragSource({ kind: "part", id: part.id });
  };

  return (
    <li>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: row is the drag target; selection is via an inner button */}
      <div
        style={{ paddingLeft: depth * 12 }}
        draggable
        onDragStart={onDragStart}
        onDragEnd={() => setDragSource(null)}
        className={`flex items-center gap-1 rounded ${
          isSelected ? "bg-blue-100" : "hover:bg-gray-100"
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect({ kind: "part", id: part.id })}
          className="flex-1 truncate text-left"
        >
          <span className="text-gray-500">●</span> {part.name}
        </button>
        <button
          type="button"
          onClick={() => onRemovePart(part.id)}
          className="px-1 text-red-500 hover:text-red-700"
          aria-label={`${part.name} を削除`}
          title="削除"
        >
          ×
        </button>
      </div>
    </li>
  );
};
