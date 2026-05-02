"use client";

import type { Part, PartGroup } from "../_lib/types";

interface Props {
  parts: Part[];
  groups: PartGroup[];
  selectedPartId: string | null;
  selectedGroupId: string | null;
  onSelectPart: (id: string) => void;
  onSelectGroup: (id: string) => void;
  onRemovePart: (id: string) => void;
  onRemoveGroup: (id: string) => void;
  // Reparent. parentId === undefined means top-level.
  onReparentPart: (id: string, parentId: string | undefined) => void;
  onReparentGroup: (id: string, parentId: string | undefined) => void;
}

interface TreeNode {
  group: PartGroup | null; // null = root container
  childGroups: TreeNode[];
  childParts: Part[];
}

// Build the nested tree from a flat groups + parts array. Orphan parts /
// groups (parentId references a non-existent group) are attached to the root
// so they are still discoverable in the UI.
const buildTree = (groups: PartGroup[], parts: Part[]): TreeNode => {
  const groupIds = new Set(groups.map((g) => g.id));
  const root: TreeNode = { group: null, childGroups: [], childParts: [] };
  const nodeById = new Map<string, TreeNode>();
  for (const g of groups) {
    nodeById.set(g.id, { group: g, childGroups: [], childParts: [] });
  }
  for (const g of groups) {
    const node = nodeById.get(g.id);
    if (!node) continue;
    const parent =
      g.parentId && groupIds.has(g.parentId) ? nodeById.get(g.parentId) : root;
    parent?.childGroups.push(node);
  }
  for (const p of parts) {
    const parent =
      p.groupId && groupIds.has(p.groupId) ? nodeById.get(p.groupId) : root;
    parent?.childParts.push(p);
  }
  return root;
};

export const PartTree = ({
  parts,
  groups,
  selectedPartId,
  selectedGroupId,
  onSelectPart,
  onSelectGroup,
  onRemovePart,
  onRemoveGroup,
  onReparentPart,
  onReparentGroup,
}: Props) => {
  const tree = buildTree(groups, parts);
  // Build a parent dropdown list: every group plus a "(top)" entry. The
  // re-parent dropdown is shown next to each row.
  const parentOptions = [{ id: "", name: "(最上位)" }, ...groups];

  return (
    <ul className="space-y-0.5">
      {/* Root-level: render the root node's children directly without an outer
          group header, since the root is a synthetic container. */}
      {tree.childGroups.map((node) => (
        <GroupNode
          key={node.group?.id}
          node={node}
          depth={0}
          parentOptions={parentOptions}
          selectedPartId={selectedPartId}
          selectedGroupId={selectedGroupId}
          onSelectPart={onSelectPart}
          onSelectGroup={onSelectGroup}
          onRemovePart={onRemovePart}
          onRemoveGroup={onRemoveGroup}
          onReparentPart={onReparentPart}
          onReparentGroup={onReparentGroup}
        />
      ))}
      {tree.childParts.map((p) => (
        <PartRow
          key={p.id}
          part={p}
          depth={0}
          parentOptions={parentOptions}
          selected={selectedPartId === p.id}
          onSelect={onSelectPart}
          onRemove={onRemovePart}
          onReparent={onReparentPart}
        />
      ))}
    </ul>
  );
};

interface GroupNodeProps {
  node: TreeNode;
  depth: number;
  parentOptions: { id: string; name: string }[];
  selectedPartId: string | null;
  selectedGroupId: string | null;
  onSelectPart: (id: string) => void;
  onSelectGroup: (id: string) => void;
  onRemovePart: (id: string) => void;
  onRemoveGroup: (id: string) => void;
  onReparentPart: (id: string, parentId: string | undefined) => void;
  onReparentGroup: (id: string, parentId: string | undefined) => void;
}

const GroupNode = ({
  node,
  depth,
  parentOptions,
  selectedPartId,
  selectedGroupId,
  onSelectPart,
  onSelectGroup,
  onRemovePart,
  onRemoveGroup,
  onReparentPart,
  onReparentGroup,
}: GroupNodeProps) => {
  const g = node.group;
  if (!g) return null;
  const indentPx = depth * 12;
  const isSelected = selectedGroupId === g.id;
  return (
    <li>
      <div
        className={`flex items-center gap-1 rounded text-xs ${
          isSelected ? "bg-amber-100 text-amber-900" : "hover:bg-gray-100"
        }`}
        style={{ paddingLeft: `${indentPx}px` }}
      >
        <span className="text-amber-600">▸</span>
        <button
          type="button"
          onClick={() => onSelectGroup(g.id)}
          className="flex-1 px-1 py-0.5 text-left font-bold"
        >
          {g.name}
        </button>
        <select
          aria-label={`${g.name} の親`}
          value={g.parentId ?? ""}
          onChange={(e) => onReparentGroup(g.id, e.target.value || undefined)}
          className="rounded border px-0.5 text-[10px]"
        >
          {parentOptions
            // can't parent group to itself or its descendants
            .filter((o) => o.id !== g.id)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
        </select>
        <button
          type="button"
          onClick={() => onRemoveGroup(g.id)}
          className="px-1 text-red-500 hover:text-red-700"
          aria-label={`${g.name} を削除`}
        >
          ×
        </button>
      </div>
      {(node.childGroups.length > 0 || node.childParts.length > 0) && (
        <ul>
          {node.childGroups.map((child) => (
            <GroupNode
              key={child.group?.id}
              node={child}
              depth={depth + 1}
              parentOptions={parentOptions}
              selectedPartId={selectedPartId}
              selectedGroupId={selectedGroupId}
              onSelectPart={onSelectPart}
              onSelectGroup={onSelectGroup}
              onRemovePart={onRemovePart}
              onRemoveGroup={onRemoveGroup}
              onReparentPart={onReparentPart}
              onReparentGroup={onReparentGroup}
            />
          ))}
          {node.childParts.map((p) => (
            <PartRow
              key={p.id}
              part={p}
              depth={depth + 1}
              parentOptions={parentOptions}
              selected={selectedPartId === p.id}
              onSelect={onSelectPart}
              onRemove={onRemovePart}
              onReparent={onReparentPart}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

interface PartRowProps {
  part: Part;
  depth: number;
  parentOptions: { id: string; name: string }[];
  selected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onReparent: (id: string, parentId: string | undefined) => void;
}

const PartRow = ({
  part,
  depth,
  parentOptions,
  selected,
  onSelect,
  onRemove,
  onReparent,
}: PartRowProps) => {
  const indentPx = depth * 12;
  return (
    <li
      className={`flex items-center gap-1 rounded text-xs ${
        selected ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100"
      }`}
      style={{ paddingLeft: `${indentPx}px` }}
    >
      <span className="text-gray-400">·</span>
      <button
        type="button"
        onClick={() => onSelect(part.id)}
        className="flex-1 px-1 py-0.5 text-left"
      >
        {part.name}
      </button>
      <select
        aria-label={`${part.name} の親`}
        value={part.groupId ?? ""}
        onChange={(e) => onReparent(part.id, e.target.value || undefined)}
        className="rounded border px-0.5 text-[10px]"
      >
        {parentOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onRemove(part.id)}
        className="px-1 text-red-500 hover:text-red-700"
        aria-label={`${part.name} を削除`}
      >
        ×
      </button>
    </li>
  );
};
