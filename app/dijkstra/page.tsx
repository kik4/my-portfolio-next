"use client";

import { useState } from "react";
import { DarkToggleButton } from "../_components/DarkToggleButton";
import { MyLink } from "../_components/MyLink";
import { dijkstra } from "./dijkstraAlgorithm";
import { GraphCanvas } from "./GraphCanvas";
import type { DijkstraStep, Edge, Mode, Node } from "./types";

export default function DijkstraPage() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: "A", x: 200, y: 80, label: "A" },
    { id: "B", x: 400, y: 80, label: "B" },
    { id: "C", x: 600, y: 80, label: "C" },
    { id: "D", x: 200, y: 225, label: "D" },
    { id: "E", x: 400, y: 225, label: "E" },
    { id: "F", x: 600, y: 225, label: "F" },
    { id: "G", x: 250, y: 370, label: "G" },
    { id: "H", x: 400, y: 370, label: "H" },
    { id: "I", x: 550, y: 370, label: "I" },
  ]);

  const [edges, setEdges] = useState<Edge[]>([
    { id: "AB", from: "A", to: "B", weight: 4 },
    { id: "AD", from: "A", to: "D", weight: 3 },
    { id: "BC", from: "B", to: "C", weight: 5 },
    { id: "BE", from: "B", to: "E", weight: 2 },
    { id: "CF", from: "C", to: "F", weight: 6 },
    { id: "DE", from: "D", to: "E", weight: 7 },
    { id: "DG", from: "D", to: "G", weight: 4 },
    { id: "EF", from: "E", to: "F", weight: 3 },
    { id: "EG", from: "E", to: "G", weight: 2 },
    { id: "EH", from: "E", to: "H", weight: 5 },
    { id: "FH", from: "F", to: "H", weight: 3 },
    { id: "FI", from: "F", to: "I", weight: 2 },
    { id: "GH", from: "G", to: "H", weight: 6 },
    { id: "HI", from: "H", to: "I", weight: 4 },
  ]);

  const [mode, setMode] = useState<Mode>("move");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [startNode, setStartNode] = useState<string | null>("A");
  const [endNode, setEndNode] = useState<string | null>("I");
  const [steps, setSteps] = useState<DijkstraStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);

  let nextNodeId = nodes.length;

  const handleCanvasClick = (x: number, y: number) => {
    if (mode === "add-node") {
      const newNode: Node = {
        id: String.fromCharCode(65 + nextNodeId),
        x,
        y,
        label: String.fromCharCode(65 + nextNodeId),
      };
      setNodes([...nodes, newNode]);
      nextNodeId++;
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (mode === "add-edge") {
      if (selectedNode === null) {
        setSelectedNode(nodeId);
      } else if (selectedNode !== nodeId) {
        // 辺を追加
        const weight = Number.parseInt(
          prompt("辺の重みを入力してください:", "1") || "1",
          10,
        );
        if (weight > 0) {
          const newEdge: Edge = {
            id: `${selectedNode}${nodeId}`,
            from: selectedNode,
            to: nodeId,
            weight,
          };
          setEdges([...edges.filter((e) => e.id !== newEdge.id), newEdge]); // 重複する辺は上書き
        }
        setSelectedNode(null);
      }
    } else if (mode === "delete") {
      // ノードを削除
      setNodes(nodes.filter((n) => n.id !== nodeId));
      setEdges(edges.filter((e) => e.from !== nodeId && e.to !== nodeId));
      if (startNode === nodeId) setStartNode(null);
      if (endNode === nodeId) setEndNode(null);
    } else if (mode === "set-start") {
      setStartNode(nodeId);
      setMode("move");
    } else if (mode === "set-end") {
      setEndNode(nodeId);
      setMode("move");
    } else if (mode === "move") {
      setSelectedNode(nodeId);
    }
  };

  const handleNodeDrag = (nodeId: string, x: number, y: number) => {
    if (mode !== "move") return;
    setNodes(nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)));
  };

  const runDijkstra = () => {
    if (!startNode || !endNode) {
      alert("開始点と終了点を設定してください");
      return;
    }

    const result = dijkstra(nodes, edges, startNode, endNode);
    setSteps(result);
    setCurrentStepIndex(0);
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const resetVisualization = () => {
    setSteps([]);
    setCurrentStepIndex(-1);
  };

  const clearGraph = () => {
    setNodes([]);
    setEdges([]);
    setStartNode(null);
    setEndNode(null);
    resetVisualization();
  };

  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="container mx-auto flex items-center justify-between px-6 py-3">
          <MyLink
            href="/"
            className="text-gray-600 text-sm hover:text-accent dark:text-gray-400 dark:hover:text-accent"
          >
            ← ホーム
          </MyLink>
          <h1 className="font-bold text-lg">ダイクストラ法ビジュアライザー</h1>
          <DarkToggleButton />
        </nav>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex flex-col gap-8">
          {/* キャンバスエリア */}
          <div className="flex flex-col items-center gap-4">
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode}
              startNode={startNode}
              endNode={endNode}
              currentStep={currentStep}
              onCanvasClick={handleCanvasClick}
              onNodeClick={handleNodeClick}
              onNodeDrag={handleNodeDrag}
            />

            {/* ステップコントロール */}
            {steps.length > 0 && (
              <div className="flex w-full max-w-[800px] flex-col gap-3 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={prevStep}
                    disabled={currentStepIndex <= 0}
                    className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                  >
                    前へ
                  </button>
                  <span className="font-medium">
                    ステップ {currentStepIndex + 1} / {steps.length}
                  </span>
                  <button
                    onClick={nextStep}
                    disabled={currentStepIndex >= steps.length - 1}
                    className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                  >
                    次へ
                  </button>
                </div>
                {currentStep && currentStep.path.length > 0 && (
                  <div className="text-center">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      最短経路: {currentStep.path.join(" → ")}
                    </p>
                    <p className="text-gray-600 text-sm dark:text-gray-400">
                      距離:{" "}
                      {(endNode && currentStep.distances.get(endNode)) ||
                        "到達不可"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* コントロールパネル */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
              <h3 className="mb-3 font-bold text-lg">モード選択</h3>
              <div className="flex flex-col gap-2">
                {[
                  { value: "move" as Mode, label: "移動", icon: "✋" },
                  { value: "add-node" as Mode, label: "頂点追加", icon: "➕" },
                  { value: "add-edge" as Mode, label: "辺追加", icon: "↔️" },
                  { value: "delete" as Mode, label: "削除", icon: "🗑️" },
                ].map((m) => (
                  <button
                    key={m.value}
                    onClick={() => {
                      setMode(m.value);
                      setSelectedNode(null);
                    }}
                    className={`rounded px-4 py-2 text-left font-medium transition ${
                      mode === m.value
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    }`}
                    type="button"
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
              <h3 className="mb-3 font-bold text-lg">開始点・終点</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setMode("set-start")}
                  className={`rounded px-4 py-2 text-left font-medium transition ${
                    mode === "set-start"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  }`}
                  type="button"
                >
                  🎯 開始点: {startNode || "未設定"}
                </button>
                <button
                  onClick={() => setMode("set-end")}
                  className={`rounded px-4 py-2 text-left font-medium transition ${
                    mode === "set-end"
                      ? "bg-red-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  }`}
                  type="button"
                >
                  🏁 終了点: {endNode || "未設定"}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
              <h3 className="mb-3 font-bold text-lg">実行</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={runDijkstra}
                  className="rounded bg-green-600 px-4 py-2 font-bold text-white transition hover:bg-green-700"
                  type="button"
                >
                  ▶ アルゴリズム実行
                </button>
                <button
                  onClick={resetVisualization}
                  className="rounded bg-yellow-600 px-4 py-2 font-medium text-white transition hover:bg-yellow-700"
                  type="button"
                >
                  🔄 リセット
                </button>
                <button
                  onClick={clearGraph}
                  className="rounded bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
                  type="button"
                >
                  🗑️ グラフをクリア
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <h3 className="mb-2 font-bold text-sm">使い方</h3>
              <ul className="space-y-1 text-gray-600 text-xs dark:text-gray-400">
                <li>• 移動: 頂点をドラッグで移動</li>
                <li>• 頂点追加: キャンバスをクリック</li>
                <li>• 辺追加: 2つの頂点を順にクリック</li>
                <li>• 削除: 頂点または辺をクリック</li>
              </ul>
            </div>

            <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
              <h3 className="mb-2 font-bold text-sm">色の意味</h3>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-600" />
                  開始点
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-600" />
                  終了点
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-yellow-600" />
                  現在探索中
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-purple-600" />
                  訪問済み
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-green-600" />
                  最短経路
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
