"use client";

import { useCallback, useEffect, useState } from "react";
import { buildDefaultModel } from "../_lib/defaultModel";
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
import type { Mesh, Model, Selection, Vec3 } from "../_lib/types";
import { MeshView } from "./MeshView";
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
  const [model, setModel] = useState<Model>(() => buildDefaultModel());
  const [selection, setSelection] = useState<Selection>(null);
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
  const [showExplicitEdges, setShowExplicitEdges] = useState(true);
  const [showSilhouette, setShowSilhouette] = useState(true);
  const [smoothSilhouette, setSmoothSilhouette] = useState(true);

  const updatePartMesh = useCallback(
    (partId: string, mut: (mesh: Mesh) => Mesh) => {
      setModel((m) => ({
        ...m,
        parts: m.parts.map((p) =>
          p.id === partId ? { ...p, mesh: mut(p.mesh) } : p,
        ),
      }));
    },
    [],
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected]);

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
          {model.parts.map((part) => (
            <Projection2DPreview
              key={part.id}
              mesh={part.mesh}
              strokeColor={part.strokeColor}
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
        {model.parts.map((part) => {
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
          model.parts.map((part) => {
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
                  updatePartMesh(part.id, (mesh) => movePoint(mesh, idx, next));
                }}
                onCommit={() => {
                  // Drag wrote final state via onDrag. History commit goes
                  // here once useHistory is wired in MS4.
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
      </aside>
      <main className="min-h-0 min-w-0 flex-1">
        <QuadView renderPane={renderPane} />
      </main>
    </div>
  );
};
