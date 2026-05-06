"use client";

import { useState } from "react";
import { buildDefaultModel } from "../_lib/defaultModel";
import type { Model } from "../_lib/types";
import { MeshView } from "./MeshView";
import { QuadView } from "./QuadView";
import { Scene, type ViewKind } from "./Scene";

export const ModelingTool = () => {
  const [model] = useState<Model>(() => buildDefaultModel());
  const [showWireframe, setShowWireframe] = useState(false);
  const [showNormals, setShowNormals] = useState(false);
  const [showWinding, setShowWinding] = useState(false);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const renderPane = (view: ViewKind) => (
    <Scene view={view} showAxes={showAxes} showGrid={showGrid}>
      {model.parts.map((part) => (
        <MeshView
          key={part.id}
          mesh={part.mesh}
          fillColor={part.fillColor}
          strokeColor={part.strokeColor}
          showWireframe={showWireframe}
          showNormals={showNormals}
          showWinding={showWinding}
        />
      ))}
    </Scene>
  );

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-64 shrink-0 overflow-y-auto border-r bg-white p-4 text-sm">
        <h2 className="mb-2 font-bold">表示</h2>
        <div className="space-y-1">
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
      </aside>
      <main className="min-h-0 min-w-0 flex-1">
        <QuadView renderPane={renderPane} />
      </main>
    </div>
  );
};
