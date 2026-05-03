"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildDefaultChildGroup,
  buildDefaultFaceModel,
  buildDefaultPart,
  buildDefaultRootGroup,
} from "../_lib/defaultModel";
import { wouldCreateCycle } from "../_lib/groupTransform";
import {
  loadFaceModelFromLocalStorage,
  saveFaceModelToLocalStorage,
  serializeFaceModel,
} from "../_lib/jsonIO";
import type { FaceModel, Group, Part } from "../_lib/types";
import { useHistory } from "../_lib/useHistory";
import { GroupEditor } from "./GroupEditor";
import { HeadCurveEditor } from "./HeadCurveEditor";
import { MultiView } from "./MultiView";
import { PartEditor } from "./PartEditor";
import { PartTree, type Selection } from "./PartTree";

// Phase 1 of the v4 spec: enough UI to confirm that the new schema renders
// (head mesh + parts under one root group). Part / group editing UIs are
// stubbed out and will be rebuilt in later phases.
export const ModelingTool = () => {
  const history = useHistory<FaceModel>(buildDefaultFaceModel());
  const {
    state: model,
    commit,
    replace,
    undo,
    redo,
    canUndo,
    canRedo,
  } = history;
  const [hydrated, setHydrated] = useState(false);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [resizing, setResizing] = useState(false);
  const [cameraYaw, setCameraYaw] = useState(0);
  const [cameraPitch, setCameraPitch] = useState(0);
  // Single selection across the whole tree: a part or a group, or nothing.
  const [selection, setSelection] = useState<Selection>(null);
  // Per-selection keyframe editing index. Reset when the selection changes.
  const [editingKfIndex, setEditingKfIndex] = useState(0);

  useEffect(() => {
    const loaded = loadFaceModelFromLocalStorage();
    if (loaded) replace(loaded);
    const savedWidth = localStorage.getItem("2d5d-modeling-sidebar-width");
    if (savedWidth) {
      const n = Number(savedWidth);
      if (Number.isFinite(n) && n >= 240 && n <= 720) setSidebarWidth(n);
    }
    setHydrated(true);
  }, [replace]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("2d5d-modeling-sidebar-width", String(sidebarWidth));
  }, [sidebarWidth, hydrated]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: PointerEvent) => {
      const next = Math.max(240, Math.min(720, e.clientX));
      setSidebarWidth(next);
    };
    const onUp = () => setResizing(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [resizing]);

  useEffect(() => {
    if (!hydrated) return;
    saveFaceModelToLocalStorage(model);
  }, [model, hydrated]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Reset the keyframe editor index when selection changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: selection trigger only
  useEffect(() => {
    setEditingKfIndex(0);
  }, [selection?.kind, selection?.id]);

  const updatePart = useCallback(
    (id: string, mut: (p: Part) => Part) => {
      commit((m) => ({
        ...m,
        parts: m.parts.map((p) => (p.id === id ? mut(p) : p)),
      }));
    },
    [commit],
  );

  const updateGroup = useCallback(
    (id: string, mut: (g: Group) => Group) => {
      commit((m) => ({
        ...m,
        groups: m.groups.map((g) => (g.id === id ? mut(g) : g)),
      }));
    },
    [commit],
  );

  const selectedPart = useMemo<Part | null>(
    () =>
      selection?.kind === "part"
        ? (model.parts.find((p) => p.id === selection.id) ?? null)
        : null,
    [model.parts, selection],
  );
  const selectedGroup = useMemo<Group | null>(
    () =>
      selection?.kind === "group"
        ? (model.groups.find((g) => g.id === selection.id) ?? null)
        : null,
    [model.groups, selection],
  );

  // ===== structure mutations =====

  const newId = (kind: string) => `${kind}-${Date.now()}`;

  const addRootGroup = () => {
    const id = newId("group");
    const g = buildDefaultRootGroup(id, "new group", [0, 0, 0.9]);
    commit((m) => ({ ...m, groups: [...m.groups, g] }));
    setSelection({ kind: "group", id });
  };

  const addChildGroup = (parentId: string) => {
    const id = newId("group");
    const g = buildDefaultChildGroup(id, "new group", parentId);
    commit((m) => ({ ...m, groups: [...m.groups, g] }));
    setSelection({ kind: "group", id });
  };

  const addPart = (groupId: string) => {
    const id = newId("part");
    const p = buildDefaultPart(id, "new part", groupId);
    commit((m) => ({ ...m, parts: [...m.parts, p] }));
    setSelection({ kind: "part", id });
  };

  // Cascade-delete a group: also remove every descendant group / part. The
  // alternative (promote children to the parent) is awkward for a root group
  // since promoted children would have nowhere to live, so we go with a
  // confirmable cascade. Undo brings everything back.
  const removeGroup = (id: string) => {
    const g = model.groups.find((x) => x.id === id);
    if (!g) return;
    const descendantIds = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const ch of model.groups) {
        if (
          ch.parentId !== null &&
          descendantIds.has(ch.parentId) &&
          !descendantIds.has(ch.id)
        ) {
          descendantIds.add(ch.id);
          grew = true;
        }
      }
    }
    if (
      !confirm(
        `グループ「${g.name}」とその配下 (グループ ${descendantIds.size - 1} 個 + 関連パーツ) を削除します。よろしいですか?`,
      )
    ) {
      return;
    }
    commit((m) => ({
      ...m,
      groups: m.groups.filter((x) => !descendantIds.has(x.id)),
      parts: m.parts.filter((p) => !descendantIds.has(p.groupId)),
    }));
    if (
      selection &&
      ((selection.kind === "group" && descendantIds.has(selection.id)) ||
        (selection.kind === "part" &&
          descendantIds.has(
            model.parts.find((p) => p.id === selection.id)?.groupId ?? "",
          )))
    ) {
      setSelection(null);
    }
  };

  const removePart = (id: string) => {
    commit((m) => ({ ...m, parts: m.parts.filter((p) => p.id !== id) }));
    if (selection?.kind === "part" && selection.id === id) setSelection(null);
  };

  const reparentGroup = (id: string, newParentId: string) => {
    if (wouldCreateCycle(model.groups, id, newParentId)) {
      alert("循環構造になるため変更できません");
      return;
    }
    commit((m) => ({
      ...m,
      groups: m.groups.map((g) =>
        // Only child groups can be reparented; the dropdown enforces this by
        // not appearing for root groups, but cast safely for type narrowing.
        g.id === id && g.parentId !== null
          ? { ...g, parentId: newParentId }
          : g,
      ),
    }));
  };

  const reparentPart = (id: string, newGroupId: string) => {
    commit((m) => ({
      ...m,
      parts: m.parts.map((p) =>
        p.id === id ? { ...p, groupId: newGroupId } : p,
      ),
    }));
  };

  const exportJson = () => {
    const blob = new Blob([serializeFaceModel(model)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "face-model.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.version === 4) commit(parsed);
    } catch {
      // ignore malformed input
    }
  };

  const resetModel = () => {
    if (confirm("デフォルトモデルにリセットしますか?")) {
      commit(buildDefaultFaceModel());
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      <aside
        style={{ width: sidebarWidth }}
        className="shrink-0 overflow-y-auto border-r bg-white p-4 text-sm"
      >
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <span className="text-gray-500 text-xs">
            視点 yaw {cameraYaw.toFixed(1)}° / pitch {cameraPitch.toFixed(1)}°
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs hover:bg-gray-200 disabled:opacity-40"
              aria-label="Undo"
            >
              ↶
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs hover:bg-gray-200 disabled:opacity-40"
              aria-label="Redo"
            >
              ↷
            </button>
          </div>
        </div>

        <h2 className="mb-2 font-bold">頭メッシュ</h2>
        <div className="mb-4 space-y-2">
          <label className="block">
            <span className="block text-gray-600 text-xs">塗り色</span>
            <input
              type="color"
              value={model.head.fillColor}
              onChange={(e) =>
                commit((m) => ({
                  ...m,
                  head: { ...m.head, fillColor: e.target.value },
                }))
              }
            />
          </label>
          <fieldset>
            <legend className="text-gray-600 text-xs">
              シルエット ({model.head.ySamples.length} 点)
            </legend>
            <HeadCurveEditor
              head={model.head}
              onChange={(nextHead) => commit((m) => ({ ...m, head: nextHead }))}
            />
          </fieldset>
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAxes}
              onChange={(e) => setShowAxes(e.target.checked)}
            />
            軸表示
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            グリッド
          </label>
        </div>

        <h2 className="mb-2 font-bold">構造</h2>
        <div className="mb-4">
          <PartTree
            groups={model.groups}
            parts={model.parts}
            selection={selection}
            onSelect={setSelection}
            onAddRootGroup={addRootGroup}
            onAddChildGroup={addChildGroup}
            onAddPart={addPart}
            onRemoveGroup={removeGroup}
            onRemovePart={removePart}
            onReparentGroup={reparentGroup}
            onReparentPart={reparentPart}
          />
        </div>
        {selectedPart && (
          <div className="mb-4">
            <PartEditor
              part={selectedPart}
              updatePart={updatePart}
              editingKfIndex={editingKfIndex}
              setEditingKfIndex={setEditingKfIndex}
              cameraYaw={cameraYaw}
              cameraPitch={cameraPitch}
            />
          </div>
        )}
        {selectedGroup && (
          <div className="mb-4">
            <GroupEditor
              group={selectedGroup}
              updateGroup={updateGroup}
              editingKfIndex={editingKfIndex}
              setEditingKfIndex={setEditingKfIndex}
              cameraYaw={cameraYaw}
              cameraPitch={cameraPitch}
            />
          </div>
        )}

        <div className="mt-4 space-y-2 border-t pt-4">
          <h3 className="font-bold text-sm">JSON</h3>
          <button
            type="button"
            onClick={exportJson}
            className="block w-full rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
          >
            書き出し
          </button>
          <label className="block w-full cursor-pointer rounded bg-gray-200 px-2 py-1 text-center text-xs hover:bg-gray-300">
            読み込み
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importJson(file);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={resetModel}
            className="block w-full rounded bg-red-100 px-2 py-1 text-red-700 text-xs hover:bg-red-200"
          >
            デフォルトに戻す
          </button>
        </div>
      </aside>

      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          setResizing(true);
        }}
        onDoubleClick={() => setSidebarWidth(320)}
        aria-label="サイドバー幅を調整 (ダブルクリックで初期化)"
        className={`w-1 shrink-0 cursor-col-resize border-0 bg-gray-200 hover:bg-blue-400 ${
          resizing ? "bg-blue-500" : ""
        }`}
      />

      <main className="min-h-0 min-w-0 flex-1">
        <MultiView
          model={model}
          showAxes={showAxes}
          showGrid={showGrid}
          onCameraChange={(y, p) => {
            setCameraYaw(y);
            setCameraPitch(p);
          }}
        />
      </main>
    </div>
  );
};
