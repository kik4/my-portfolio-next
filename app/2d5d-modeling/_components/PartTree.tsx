/** biome-ignore-all lint/a11y/noStaticElementInteractions: native HTML5 DnD on tree rows */
"use client";

import { useState } from "react";
import type { ActiveNode, Group, Part } from "../_lib/types";

interface DragPayload {
  kind: "group" | "part";
  id: string;
}

interface Props {
  groups: Group[];
  parts: Part[];
  activeNode: ActiveNode;
  onActivate: (node: ActiveNode) => void;
  onAddRootGroup: () => void;
  onAddChildGroup: (parentId: string) => void;
  onAddPart: (groupId: string) => void;
  onRemoveGroup: (id: string) => void;
  onRemovePart: (id: string) => void;
  onToggleGroupVisible: (id: string) => void;
  onTogglePartVisible: (id: string) => void;
  // Move a group under a new parent (`null` = root). Caller validates cycles.
  onReparentGroup: (groupId: string, newParentId: string | null) => void;
  // Move a part under a different group.
  onReparentPart: (partId: string, newGroupId: string) => void;
}

const isActive = (active: ActiveNode, kind: "part" | "group", id: string) =>
  active?.kind === kind && active.id === id;

const DND_MIME = "application/x-2d5d-tree-node";

export const PartTree = ({
  groups,
  parts,
  activeNode,
  onActivate,
  onAddRootGroup,
  onAddChildGroup,
  onAddPart,
  onRemoveGroup,
  onRemovePart,
  onToggleGroupVisible,
  onTogglePartVisible,
  onReparentGroup,
  onReparentPart,
}: Props) => {
  // dropTarget tracks the group id (or "root") under hover so we can
  // highlight it. null = no current target.
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const childGroupsOf = (parentId: string | null) =>
    groups.filter((g) => g.parentId === parentId);
  const partsOf = (groupId: string) =>
    parts.filter((p) => p.groupId === groupId);

  const readPayload = (e: React.DragEvent): DragPayload | null => {
    const raw = e.dataTransfer.getData(DND_MIME);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  };

  const startDrag = (e: React.DragEvent, payload: DragPayload) => {
    e.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnGroup = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    const payload = readPayload(e);
    if (!payload) return;
    if (payload.kind === "part") {
      onReparentPart(payload.id, targetGroupId);
    } else {
      onReparentGroup(payload.id, targetGroupId);
    }
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    const payload = readPayload(e);
    if (!payload) return;
    // Only groups can become root; parts must live under a group.
    if (payload.kind === "group") {
      onReparentGroup(payload.id, null);
    }
  };

  const renderGroup = (group: Group, depth: number) => {
    const active = isActive(activeNode, "group", group.id);
    const isDropHover = dropTarget === group.id;
    return (
      <div key={group.id}>
        <div
          className={`flex items-center gap-1 rounded px-1 ${
            isDropHover
              ? "bg-yellow-100"
              : active
                ? "bg-blue-100"
                : "hover:bg-gray-100"
          }`}
          style={{ paddingLeft: depth * 12 + 4 }}
          draggable
          onDragStart={(e) => startDrag(e, { kind: "group", id: group.id })}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDropTarget(group.id);
          }}
          onDragLeave={() => {
            setDropTarget((t) => (t === group.id ? null : t));
          }}
          onDrop={(e) => handleDropOnGroup(e, group.id)}
        >
          <button
            type="button"
            onClick={() => onToggleGroupVisible(group.id)}
            title={group.visible ? "非表示にする" : "表示する"}
            className="w-4 text-center text-gray-600 text-xs"
          >
            {group.visible ? "👁" : "·"}
          </button>
          <button
            type="button"
            onClick={() => onActivate({ kind: "group", id: group.id })}
            className={`flex-1 truncate text-left text-xs ${
              active ? "font-bold" : ""
            }`}
          >
            📁 {group.name}
          </button>
          <button
            type="button"
            onClick={() => onAddChildGroup(group.id)}
            title="子グループ追加"
            className="text-[10px] text-gray-500 hover:text-blue-600"
          >
            +G
          </button>
          <button
            type="button"
            onClick={() => onAddPart(group.id)}
            title="パーツ追加"
            className="text-[10px] text-gray-500 hover:text-blue-600"
          >
            +P
          </button>
          <button
            type="button"
            onClick={() => onRemoveGroup(group.id)}
            title="グループを削除 (配下も含む)"
            className="text-[10px] text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
        {childGroupsOf(group.id).map((child) => renderGroup(child, depth + 1))}
        {partsOf(group.id).map((part) => renderPart(part, depth + 1))}
      </div>
    );
  };

  const renderPart = (part: Part, depth: number) => {
    const active = isActive(activeNode, "part", part.id);
    return (
      <div
        key={part.id}
        className={`flex items-center gap-1 rounded px-1 ${
          active ? "bg-blue-100" : "hover:bg-gray-100"
        }`}
        style={{ paddingLeft: depth * 12 + 4 }}
        draggable
        onDragStart={(e) => startDrag(e, { kind: "part", id: part.id })}
      >
        <button
          type="button"
          onClick={() => onTogglePartVisible(part.id)}
          title={part.visible ? "非表示にする" : "表示する"}
          className="w-4 text-center text-gray-600 text-xs"
        >
          {part.visible ? "👁" : "·"}
        </button>
        <button
          type="button"
          onClick={() => onActivate({ kind: "part", id: part.id })}
          className={`flex-1 truncate text-left text-xs ${
            active ? "font-bold" : ""
          }`}
        >
          🔷 {part.name}
        </button>
        <button
          type="button"
          onClick={() => onRemovePart(part.id)}
          title="パーツを削除"
          className="text-[10px] text-red-500 hover:text-red-700"
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-1 flex justify-between gap-1">
        <button
          type="button"
          onClick={onAddRootGroup}
          className="rounded bg-gray-100 px-2 py-0.5 text-[11px] hover:bg-gray-200"
        >
          + ルートグループ
        </button>
      </div>
      <div
        className={`rounded border bg-white py-1 ${
          dropTarget === "__root__" ? "border-yellow-400" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDropTarget("__root__");
        }}
        onDragLeave={() => {
          setDropTarget((t) => (t === "__root__" ? null : t));
        }}
        onDrop={handleDropOnRoot}
      >
        {childGroupsOf(null).length === 0 ? (
          <div className="px-2 py-1 text-[11px] text-gray-400">
            グループがありません (root にドロップ可)
          </div>
        ) : (
          childGroupsOf(null).map((g) => renderGroup(g, 0))
        )}
      </div>
    </div>
  );
};
