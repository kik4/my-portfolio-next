"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildDefaultModel,
  buildNewGroup,
  buildNewPart,
} from "../_lib/defaultModel";
import {
  loadModelFromLocalStorage,
  parseModel,
  saveModelToLocalStorage,
  serializeModel,
} from "../_lib/jsonIO";
import {
  addEdge,
  addFace,
  addPoint,
  flipFace,
  movePoint,
  removeEdge,
  removeFace,
  removePoint,
} from "../_lib/meshOps";
import { wouldCreateCycle } from "../_lib/treeOps";
import type {
  ActiveNode,
  Group,
  Mesh,
  Model,
  Part,
  Selection,
  Vec3,
} from "../_lib/types";
import { useHistory } from "../_lib/useHistory";
import { MeshView } from "./MeshView";
import { NodeEditor } from "./NodeEditor";
import { PartTree } from "./PartTree";
import { PointDragger2D } from "./PointDragger2D";
import { PointGizmo } from "./PointGizmo";
import { Projection2DPreview } from "./Projection2DPreview";
import { QuadView } from "./QuadView";
import { Scene, type ViewKind } from "./Scene";

type PerspectiveMode = "mesh" | "projection";

const togglePointInSelection = (
  selection: Selection,
  partId: string,
  pointIndex: number,
  shift: boolean,
): Selection => {
  if (!shift) {
    return { kind: "points", partId, pointIndices: [pointIndex] };
  }
  if (selection?.kind === "points" && selection.partId === partId) {
    const exists = selection.pointIndices.includes(pointIndex);
    const next = exists
      ? selection.pointIndices.filter((i) => i !== pointIndex)
      : [...selection.pointIndices, pointIndex];
    if (next.length === 0) return null;
    return { kind: "points", partId, pointIndices: next };
  }
  return { kind: "points", partId, pointIndices: [pointIndex] };
};

export const ModelingTool = () => {
  const history = useHistory<Model>(buildDefaultModel());
  const {
    state: model,
    commit,
    replace,
    preview,
    undo,
    redo,
    canUndo,
    canRedo,
  } = history;
  const [selection, setSelection] = useState<Selection>(null);
  const [activeNode, setActiveNode] = useState<ActiveNode>(null);
  const [hydrated, setHydrated] = useState(false);

  // Activating a part/group from the tree clears element-level selection so
  // the user doesn't get stuck with stale point/edge/face highlights from a
  // previously focused part.
  const activate = useCallback((node: ActiveNode) => {
    setActiveNode(node);
    setSelection(null);
  }, []);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showNormals, setShowNormals] = useState(false);
  const [showWinding, setShowWinding] = useState(false);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  // 3D pane content. "mesh" = full 3D editing view; "projection" = 2D
  // line preview (explicit edges + silhouette) using the same camera so
  // orbiting confirms the silhouette tracks the view.
  const [perspectiveMode, setPerspectiveMode] =
    useState<PerspectiveMode>("mesh");
  const [showFill, setShowFill] = useState(true);
  const [showExplicitEdges, setShowExplicitEdges] = useState(true);
  const [showSilhouette, setShowSilhouette] = useState(true);
  const [smoothSilhouette, setSmoothSilhouette] = useState(true);

  // Hydrate from localStorage once on mount. `replace` resets history to
  // the loaded value as the new initial state — Undo can't go back beyond it.
  useEffect(() => {
    const loaded = loadModelFromLocalStorage();
    if (loaded) replace(loaded);
    setHydrated(true);
  }, [replace]);

  // Auto-save every committed model change after hydration. Skipping the
  // pre-hydration phase prevents the default model from clobbering a saved
  // one before the load completes.
  useEffect(() => {
    if (!hydrated) return;
    saveModelToLocalStorage(model);
  }, [model, hydrated]);

  // commit-flavoured update for structural changes (add/remove/flip, drag end).
  const updatePartMesh = useCallback(
    (partId: string, mut: (mesh: Mesh) => Mesh) => {
      commit((m) => ({
        ...m,
        parts: m.parts.map((p) =>
          p.id === partId ? { ...p, mesh: mut(p.mesh) } : p,
        ),
      }));
    },
    [commit],
  );

  // preview-flavoured update for in-progress drags. Replaces head without
  // pushing a new history entry; the drag-end handler should call
  // updatePartMesh once to make the final value undoable.
  const previewPartMesh = useCallback(
    (partId: string, mut: (mesh: Mesh) => Mesh) => {
      preview((m) => ({
        ...m,
        parts: m.parts.map((p) =>
          p.id === partId ? { ...p, mesh: mut(p.mesh) } : p,
        ),
      }));
    },
    [preview],
  );

  const selectedPart =
    selection && "partId" in selection
      ? (model.parts.find((p) => p.id === selection.partId) ?? null)
      : null;

  const deleteSelected = useCallback(() => {
    if (!selection || !selectedPart) return;
    if (selection.kind === "points") {
      // Delete from highest index down so earlier indices stay valid.
      const sorted = [...selection.pointIndices].sort((a, b) => b - a);
      updatePartMesh(selectedPart.id, (mesh) =>
        sorted.reduce((m, idx) => removePoint(m, idx), mesh),
      );
    } else if (selection.kind === "edge") {
      updatePartMesh(selectedPart.id, (mesh) =>
        removeEdge(mesh, selection.edgeIndex),
      );
    } else if (selection.kind === "face") {
      updatePartMesh(selectedPart.id, (mesh) =>
        removeFace(mesh, selection.faceIndex),
      );
    }
    setSelection(null);
  }, [selection, selectedPart, updatePartMesh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
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
  }, [deleteSelected, undo, redo]);

  const addNewPoint = () => {
    const part = selectedPart ?? model.parts[0];
    if (!part) return;
    updatePartMesh(part.id, (mesh) => addPoint(mesh, [0, 0, 0]).mesh);
    // Select the just-added point so it can be moved immediately.
    const newIndex = part.mesh.points.length;
    setSelection({ kind: "points", partId: part.id, pointIndices: [newIndex] });
  };

  const connectEdge = () => {
    if (selection?.kind !== "points" || !selectedPart) return;
    if (selection.pointIndices.length !== 2) return;
    const [a, b] = selection.pointIndices;
    updatePartMesh(selectedPart.id, (mesh) => addEdge(mesh, a, b).mesh);
  };

  const buildFace = () => {
    if (selection?.kind !== "points" || !selectedPart) return;
    if (selection.pointIndices.length !== 3) return;
    const [a, b, c] = selection.pointIndices;
    updatePartMesh(selectedPart.id, (mesh) => addFace(mesh, a, b, c).mesh);
  };

  const flipSelectedFace = () => {
    if (selection?.kind !== "face" || !selectedPart) return;
    updatePartMesh(selectedPart.id, (mesh) =>
      flipFace(mesh, selection.faceIndex),
    );
  };

  // ===== Tree operations =====

  const newId = (kind: string) =>
    `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const addRootGroup = () => {
    const id = newId("group");
    const g = buildNewGroup(id, "new group", null);
    commit((m) => ({ ...m, groups: [...m.groups, g] }));
    activate({ kind: "group", id });
  };

  const addChildGroup = (parentId: string) => {
    const id = newId("group");
    const g = buildNewGroup(id, "new group", parentId);
    commit((m) => ({ ...m, groups: [...m.groups, g] }));
    activate({ kind: "group", id });
  };

  const addPart = (groupId: string) => {
    const id = newId("part");
    const p = buildNewPart(id, "new part", groupId);
    commit((m) => ({ ...m, parts: [...m.parts, p] }));
    activate({ kind: "part", id });
  };

  // Cascade-delete a group and every descendant group + part. Confirmable so
  // an accidental click on the × doesn't take the whole subtree quietly.
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
    const partsToRemove = model.parts.filter((p) =>
      descendantIds.has(p.groupId),
    ).length;
    if (
      !confirm(
        `グループ「${g.name}」とその配下 (グループ ${descendantIds.size - 1} 個 / パーツ ${partsToRemove} 個) を削除します。よろしいですか?`,
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
      activeNode &&
      ((activeNode.kind === "group" && descendantIds.has(activeNode.id)) ||
        (activeNode.kind === "part" &&
          descendantIds.has(
            model.parts.find((p) => p.id === activeNode.id)?.groupId ?? "",
          )))
    ) {
      activate(null);
    }
  };

  const removePart = (id: string) => {
    commit((m) => ({ ...m, parts: m.parts.filter((p) => p.id !== id) }));
    if (activeNode?.kind === "part" && activeNode.id === id) activate(null);
    // Drop any element-level selection on the removed part too.
    if (selection && "partId" in selection && selection.partId === id) {
      setSelection(null);
    }
  };

  const toggleGroupVisible = (id: string) => {
    commit((m) => ({
      ...m,
      groups: m.groups.map((g) =>
        g.id === id ? { ...g, visible: !g.visible } : g,
      ),
    }));
  };

  const togglePartVisible = (id: string) => {
    commit((m) => ({
      ...m,
      parts: m.parts.map((p) =>
        p.id === id ? { ...p, visible: !p.visible } : p,
      ),
    }));
  };

  const reparentGroup = (id: string, newParentId: string | null) => {
    if (
      newParentId !== null &&
      wouldCreateCycle(model.groups, id, newParentId)
    ) {
      alert("循環構造になるため変更できません");
      return;
    }
    const target = model.groups.find((g) => g.id === id);
    if (!target || target.parentId === newParentId) return;
    commit((m) => ({
      ...m,
      groups: m.groups.map((g) =>
        g.id === id ? { ...g, parentId: newParentId } : g,
      ),
    }));
  };

  const reparentPart = (id: string, newGroupId: string) => {
    const target = model.parts.find((p) => p.id === id);
    if (!target || target.groupId === newGroupId) return;
    commit((m) => ({
      ...m,
      parts: m.parts.map((p) =>
        p.id === id ? { ...p, groupId: newGroupId } : p,
      ),
    }));
  };

  const replacePart = (next: Part) => {
    commit((m) => ({
      ...m,
      parts: m.parts.map((p) => (p.id === next.id ? next : p)),
    }));
  };

  const replaceGroup = (next: Group) => {
    commit((m) => ({
      ...m,
      groups: m.groups.map((g) => (g.id === next.id ? next : g)),
    }));
  };

  const exportJson = () => {
    const blob = new Blob([serializeModel(model)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "2d5d-model.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    const parsed = parseModel(text);
    // parseModel returns the default model on malformed input; double-check
    // version so accidental drops of unrelated JSON files don't silently
    // wipe the current scene.
    if (parsed.version !== 5) {
      alert("対応していない JSON 形式です (version 5 のみ)");
      return;
    }
    commit(parsed);
    setSelection(null);
    activate(null);
  };

  const resetModel = () => {
    if (!confirm("デフォルトモデル (球) にリセットしますか?")) return;
    commit(buildDefaultModel());
    setSelection(null);
    activate(null);
  };

  const activePart =
    activeNode?.kind === "part"
      ? (model.parts.find((p) => p.id === activeNode.id) ?? null)
      : null;
  const activeGroup =
    activeNode?.kind === "group"
      ? (model.groups.find((g) => g.id === activeNode.id) ?? null)
      : null;

  // A part is visible only if it is itself visible AND every ancestor group
  // is visible. Cached per render via a Map keyed by part id.
  const visiblePartIds = (() => {
    const groupVisible = new Map<string, boolean>();
    const isGroupVisible = (id: string): boolean => {
      const cached = groupVisible.get(id);
      if (cached !== undefined) return cached;
      const g = model.groups.find((x) => x.id === id);
      if (!g) {
        groupVisible.set(id, false);
        return false;
      }
      const v = g.visible && (g.parentId ? isGroupVisible(g.parentId) : true);
      groupVisible.set(id, v);
      return v;
    };
    const ids = new Set<string>();
    for (const p of model.parts) {
      if (p.visible && isGroupVisible(p.groupId)) ids.add(p.id);
    }
    return ids;
  })();
  const visibleParts = model.parts.filter((p) => visiblePartIds.has(p.id));

  const renderPane = (view: ViewKind) => {
    const selectedPointPos: Vec3 | null =
      selection?.kind === "points" &&
      selection.pointIndices.length === 1 &&
      selectedPart
        ? (selectedPart.mesh.points[selection.pointIndices[0]] ?? null)
        : null;

    // Projection preview replaces the entire mesh+gizmo content of the 3D
    // pane. Silhouette is recomputed each frame against the live camera.
    if (view === "perspective" && perspectiveMode === "projection") {
      return (
        <Scene view={view} showAxes={showAxes} showGrid={showGrid}>
          {visibleParts.map((part) => (
            <Projection2DPreview
              key={part.id}
              mesh={part.mesh}
              strokeColor={part.strokeColor}
              fillColor={part.fillColor}
              showFill={showFill}
              showExplicitEdges={showExplicitEdges}
              showSilhouette={showSilhouette}
              smoothSilhouette={smoothSilhouette}
            />
          ))}
        </Scene>
      );
    }

    return (
      <Scene view={view} showAxes={showAxes} showGrid={showGrid}>
        {visibleParts.map((part) => {
          const sel =
            selection && "partId" in selection && selection.partId === part.id
              ? selection.kind === "points"
                ? { kind: "points" as const, indices: selection.pointIndices }
                : selection.kind === "edge"
                  ? { kind: "edge" as const, index: selection.edgeIndex }
                  : { kind: "face" as const, index: selection.faceIndex }
              : null;
          return (
            <MeshView
              key={part.id}
              mesh={part.mesh}
              fillColor={part.fillColor}
              strokeColor={part.strokeColor}
              showWireframe={showWireframe}
              showNormals={showNormals}
              showWinding={showWinding}
              selected={sel}
              // 3D pane handles point selection via MeshView. 2D panes
              // route point clicks through PointDragger2D instead.
              onPointClick={
                view === "perspective"
                  ? (idx, mods) => {
                      setSelection((cur) =>
                        togglePointInSelection(cur, part.id, idx, mods.shift),
                      );
                    }
                  : undefined
              }
              onEdgeClick={(idx) => {
                setSelection({ kind: "edge", partId: part.id, edgeIndex: idx });
              }}
              onFaceClick={(idx) => {
                setSelection({ kind: "face", partId: part.id, faceIndex: idx });
              }}
            />
          );
        })}

        {view !== "perspective" &&
          visibleParts.map((part) => {
            const isSelectedPart =
              selection?.kind === "points" && selection.partId === part.id;
            const selIndices = isSelectedPart ? selection.pointIndices : [];
            return (
              <PointDragger2D
                key={part.id}
                view={view}
                points={part.mesh.points}
                selectedIndices={selIndices}
                onSelect={(idx, mods) => {
                  setSelection((cur) =>
                    togglePointInSelection(cur, part.id, idx, mods.shift),
                  );
                }}
                onDrag={(idx, next) => {
                  // Live drag: replace head only, no history entry.
                  previewPartMesh(part.id, (mesh) =>
                    movePoint(mesh, idx, next),
                  );
                }}
                onCommit={(idx, next) => {
                  // Pointer up: push a single history entry for this drag.
                  updatePartMesh(part.id, (mesh) => movePoint(mesh, idx, next));
                }}
              />
            );
          })}

        {view === "perspective" && selectedPart && selectedPointPos && (
          <PointGizmo
            position={selectedPointPos}
            onCommit={(next) => {
              if (selection?.kind !== "points") return;
              const idx = selection.pointIndices[0];
              updatePartMesh(selectedPart.id, (mesh) =>
                movePoint(mesh, idx, next),
              );
            }}
          />
        )}
      </Scene>
    );
  };

  const selectionLabel = (() => {
    if (!selection) return "未選択";
    if (selection.kind === "points")
      return `点 ${selection.pointIndices.length} 個 (${selection.pointIndices.join(", ")})`;
    if (selection.kind === "edge") return `辺 #${selection.edgeIndex}`;
    return `面 #${selection.faceIndex}`;
  })();

  const canConnectEdge =
    selection?.kind === "points" && selection.pointIndices.length === 2;
  const canBuildFace =
    selection?.kind === "points" && selection.pointIndices.length === 3;

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-72 shrink-0 overflow-y-auto border-r bg-white p-4 text-sm">
        <div className="mb-3 flex justify-end gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs hover:bg-gray-200 disabled:opacity-40"
            aria-label="Undo (Ctrl+Z)"
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs hover:bg-gray-200 disabled:opacity-40"
            aria-label="Redo (Ctrl+Shift+Z)"
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷
          </button>
        </div>
        <h2 className="mb-2 font-bold">表示</h2>
        <div className="mb-4 space-y-1">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAxes}
              onChange={(e) => setShowAxes(e.target.checked)}
            />
            軸
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            グリッド
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showWireframe}
              onChange={(e) => setShowWireframe(e.target.checked)}
            />
            wireframe
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showNormals}
              onChange={(e) => setShowNormals(e.target.checked)}
            />
            法線方向
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showWinding}
              onChange={(e) => setShowWinding(e.target.checked)}
            />
            winding 色分け (表青/裏赤)
          </label>
        </div>

        <h2 className="mb-2 font-bold">3D ペイン</h2>
        <div className="mb-4 space-y-1">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPerspectiveMode("mesh")}
              className={`flex-1 rounded px-2 py-0.5 text-xs ${
                perspectiveMode === "mesh"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              メッシュ
            </button>
            <button
              type="button"
              onClick={() => setPerspectiveMode("projection")}
              className={`flex-1 rounded px-2 py-0.5 text-xs ${
                perspectiveMode === "projection"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              投影プレビュー
            </button>
          </div>
          {perspectiveMode === "projection" && (
            <div className="space-y-1 pt-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showFill}
                  onChange={(e) => setShowFill(e.target.checked)}
                />
                面塗り
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showExplicitEdges}
                  onChange={(e) => setShowExplicitEdges(e.target.checked)}
                />
                明示エッジ
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showSilhouette}
                  onChange={(e) => setShowSilhouette(e.target.checked)}
                />
                シルエット (赤)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={smoothSilhouette}
                  onChange={(e) => setSmoothSilhouette(e.target.checked)}
                />
                シルエットを Catmull-Rom で滑らか化
              </label>
            </div>
          )}
        </div>

        <h2 className="mb-2 font-bold">構造</h2>
        <div className="mb-4">
          <PartTree
            groups={model.groups}
            parts={model.parts}
            activeNode={activeNode}
            onActivate={activate}
            onAddRootGroup={addRootGroup}
            onAddChildGroup={addChildGroup}
            onAddPart={addPart}
            onRemoveGroup={removeGroup}
            onRemovePart={removePart}
            onToggleGroupVisible={toggleGroupVisible}
            onTogglePartVisible={togglePartVisible}
            onReparentGroup={reparentGroup}
            onReparentPart={reparentPart}
          />
        </div>

        {(activePart || activeGroup) && (
          <>
            <h2 className="mb-2 font-bold">
              {activePart ? "パーツ" : "グループ"}
            </h2>
            <div className="mb-4">
              {activePart && (
                <NodeEditor
                  kind="part"
                  part={activePart}
                  onChange={replacePart}
                />
              )}
              {activeGroup && (
                <NodeEditor
                  kind="group"
                  group={activeGroup}
                  onChange={replaceGroup}
                />
              )}
            </div>
          </>
        )}

        <h2 className="mb-2 font-bold">選択</h2>
        <div className="mb-2 text-gray-600 text-xs">{selectionLabel}</div>
        <div className="mb-4 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelection(null)}
            disabled={!selection}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs hover:bg-gray-200 disabled:opacity-40"
          >
            選択解除
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={!selection}
            className="rounded bg-red-100 px-2 py-0.5 text-red-700 text-xs hover:bg-red-200 disabled:opacity-40"
          >
            削除 (Del)
          </button>
        </div>

        <h2 className="mb-2 font-bold">操作</h2>
        <div className="mb-4 space-y-1">
          <button
            type="button"
            onClick={addNewPoint}
            className="block w-full rounded bg-gray-100 px-2 py-1 text-left text-xs hover:bg-gray-200"
          >
            点を追加 (原点)
          </button>
          <button
            type="button"
            onClick={connectEdge}
            disabled={!canConnectEdge}
            className="block w-full rounded bg-gray-100 px-2 py-1 text-left text-xs hover:bg-gray-200 disabled:opacity-40"
          >
            辺を結ぶ (2 点選択時)
          </button>
          <button
            type="button"
            onClick={buildFace}
            disabled={!canBuildFace}
            className="block w-full rounded bg-gray-100 px-2 py-1 text-left text-xs hover:bg-gray-200 disabled:opacity-40"
          >
            面を張る (3 点選択時)
          </button>
          <button
            type="button"
            onClick={flipSelectedFace}
            disabled={selection?.kind !== "face"}
            className="block w-full rounded bg-gray-100 px-2 py-1 text-left text-xs hover:bg-gray-200 disabled:opacity-40"
          >
            面の法線を反転
          </button>
        </div>

        <p className="mt-4 text-[11px] text-gray-500 leading-tight">
          点はクリックで選択、Shift+クリックで複数選択。辺・面は線/面をクリックで選択。
        </p>

        <h2 className="mt-4 mb-2 border-t pt-4 font-bold">JSON</h2>
        <div className="space-y-2">
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
      <main className="min-h-0 min-w-0 flex-1">
        <QuadView renderPane={renderPane} />
      </main>
    </div>
  );
};
