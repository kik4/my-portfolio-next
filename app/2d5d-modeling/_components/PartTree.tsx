"use client";

import type { Group, Part } from "../_lib/types";

export type Selection =
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
}: GroupNodeProps) => {
  const childGroups = groups.filter((g) => g.parentId === group.id);
  const childParts = parts.filter((p) => p.groupId === group.id);
  const isSelected = selection?.kind === "group" && selection.id === group.id;
  // Reparent target list: any group that wouldn't make a cycle. We don't
  // detect cycles here for the dropdown; the parent's onReparentGroup must
  // reject invalid moves.
  const reparentTargets = groups.filter((g) => g.id !== group.id);

  return (
    <li>
      <div
        style={{ paddingLeft: depth * 12 }}
        className={`flex items-center gap-1 rounded ${
          isSelected ? "bg-blue-100" : "hover:bg-gray-100"
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect({ kind: "group", id: group.id })}
          className="flex-1 truncate text-left"
        >
          <span className="text-gray-500">
            {group.parentId === null ? "◆" : "◇"}
          </span>{" "}
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
        {group.parentId !== null && (
          <select
            value={group.parentId ?? ""}
            onChange={(e) => onReparentGroup(group.id, e.target.value)}
            className="w-16 rounded border bg-white text-[10px]"
            aria-label={`${group.name} の親`}
            title="親を変更"
          >
            {reparentTargets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
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
            />
          ))}
          {childParts.map((p) => (
            <PartNode
              key={p.id}
              part={p}
              depth={depth + 1}
              groups={groups}
              selection={selection}
              onSelect={onSelect}
              onRemovePart={onRemovePart}
              onReparentPart={onReparentPart}
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
  groups: Group[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  onRemovePart: (id: string) => void;
  onReparentPart: (id: string, newGroupId: string) => void;
}

const PartNode = ({
  part,
  depth,
  groups,
  selection,
  onSelect,
  onRemovePart,
  onReparentPart,
}: PartNodeProps) => {
  const isSelected = selection?.kind === "part" && selection.id === part.id;
  return (
    <li>
      <div
        style={{ paddingLeft: depth * 12 }}
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
        <select
          value={part.groupId}
          onChange={(e) => onReparentPart(part.id, e.target.value)}
          className="w-16 rounded border bg-white text-[10px]"
          aria-label={`${part.name} のグループ`}
          title="所属グループを変更"
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
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
