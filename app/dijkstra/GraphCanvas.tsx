"use client";

import { useEffect, useRef } from "react";
import type { DijkstraStep, Edge, Node } from "./types";

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  selectedNode: string | null;
  startNode: string | null;
  endNode: string | null;
  currentStep: DijkstraStep | null;
  onCanvasClick: (x: number, y: number) => void;
  onNodeClick: (nodeId: string) => void;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
  onEdgeClick: (edgeId: string) => void;
  onEdgeDrag: (edgeId: string, x: number, y: number) => void;
}

export function GraphCanvas({
  nodes,
  edges,
  selectedNode,
  startNode,
  endNode,
  currentStep,
  onCanvasClick,
  onNodeClick,
  onNodeDrag,
  onEdgeClick,
  onEdgeDrag,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggedNodeRef = useRef<string | null>(null);
  const draggedEdgeRef = useRef<string | null>(null);

  // 描画処理
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 辺を描画
    for (const edge of edges) {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);

      if (!fromNode || !toNode) continue;

      const isInPath =
        currentStep?.path.includes(edge.from) &&
        currentStep?.path.includes(edge.to) &&
        Math.abs(
          currentStep.path.indexOf(edge.from) -
            currentStep.path.indexOf(edge.to),
        ) === 1;

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.strokeStyle = isInPath ? "#10b981" : "#6b7280";
      ctx.lineWidth = isInPath ? 4 : 2;
      ctx.stroke();

      // 重みを表示
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      ctx.fillStyle = isInPath ? "#ebfff8" : "#ffffff";
      ctx.fillRect(midX - 15, midY - 12, 30, 24);

      // パスの一部の場合は緑の枠線を追加
      if (isInPath) {
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.strokeRect(midX - 15, midY - 12, 30, 24);
      }

      ctx.fillStyle = isInPath ? "#10b981" : "#374151";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(edge.weight.toString(), midX, midY);
    }

    // ノードを描画
    for (const node of nodes) {
      const isVisited = currentStep?.visitedNodes.has(node.id);
      const isCurrent = currentStep?.currentNode === node.id;
      const isStart = node.id === startNode;
      const isEnd = node.id === endNode;
      const isSelected = node.id === selectedNode;
      const isInPath = currentStep?.path.includes(node.id);

      // ノードの円
      ctx.beginPath();
      ctx.arc(node.x, node.y, 25, 0, Math.PI * 2);

      if (isCurrent) {
        ctx.fillStyle = "#f59e0b";
      } else if (isInPath) {
        ctx.fillStyle = "#10b981";
      } else if (isStart) {
        ctx.fillStyle = "#3b82f6";
      } else if (isEnd) {
        ctx.fillStyle = "#ef4444";
      } else if (isVisited) {
        ctx.fillStyle = "#8b5cf6";
      } else {
        ctx.fillStyle = "#e5e7eb";
      }

      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#1f2937";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // ノードのラベル
      ctx.fillStyle =
        isVisited || isStart || isEnd || isInPath ? "#ffffff" : "#1f2937";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, node.x, node.y);

      // 距離を表示（計算中の場合）
      if (currentStep && !isInPath) {
        const distance = currentStep.distances.get(node.id);
        if (distance !== undefined && distance !== Number.POSITIVE_INFINITY) {
          const text = `d=${distance}`;
          const textY = node.y + 40;

          // 薄い青の背景を描画（辺の重みと差別化）
          ctx.fillStyle = "#dbeafe";
          ctx.fillRect(node.x - 20, textY - 10, 40, 20);

          // 青い枠線を追加
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1;
          ctx.strokeRect(node.x - 20, textY - 10, 40, 20);

          // テキストを描画
          ctx.fillStyle = "#1e40af";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text, node.x, textY);
        }
      }
    }
  }, [nodes, edges, selectedNode, startNode, endNode, currentStep]);

  // マウスイベント処理
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // ノードのクリック判定
    for (const node of nodes) {
      const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
      if (distance <= 25) {
        draggedNodeRef.current = node.id;
        onNodeClick(node.id);
        return;
      }
    }

    // 辺のクリック判定
    for (const edge of edges) {
      const { from, to } = edge;
      const fromNode = nodes.find((n) => n.id === from);
      const toNode = nodes.find((n) => n.id === to);
      if (fromNode && toNode) {
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        const distance = Math.sqrt((midX - x) ** 2 + (midY - y) ** 2);
        if (distance <= 15) {
          draggedEdgeRef.current = edge.id;
          onEdgeClick(edge.id);
          return;
        }
      }
    }

    // キャンバスのクリック
    onCanvasClick(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (draggedNodeRef.current) {
      onNodeDrag(draggedNodeRef.current, x, y);
    } else if (draggedEdgeRef.current) {
      onEdgeDrag(draggedEdgeRef.current, x, y);
    }
  };

  const handleMouseUp = () => {
    draggedNodeRef.current = null;
    draggedEdgeRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={450}
      className="cursor-crosshair rounded-lg border-2 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
