"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CrossSection, Point2D } from "./types";

interface CrossSectionEditorProps {
  section: CrossSection;
  onChange: (section: CrossSection) => void;
}

const CANVAS_SIZE = 400;
const PADDING = 40;
const DRAW_SIZE = CANVAS_SIZE - PADDING * 2;
const POINT_RADIUS = 5;

/** 断面座標（-1〜1）→Canvas座標 */
function toCanvas(p: Point2D): { cx: number; cy: number } {
  return {
    cx: PADDING + (p.x + 1) * (DRAW_SIZE / 2),
    cy: PADDING + (1 - p.y) * (DRAW_SIZE / 2),
  };
}

/** Canvas座標→断面座標（-1〜1） */
function fromCanvas(cx: number, cy: number): Point2D {
  return {
    x: (cx - PADDING) / (DRAW_SIZE / 2) - 1,
    y: 1 - (cy - PADDING) / (DRAW_SIZE / 2),
  };
}

export function CrossSectionEditor({
  section,
  onChange,
}: CrossSectionEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 背景
    ctx.fillStyle = "#f8f8f8";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // グリッド
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const pos = PADDING + (DRAW_SIZE / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pos, PADDING);
      ctx.lineTo(pos, PADDING + DRAW_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PADDING, pos);
      ctx.lineTo(PADDING + DRAW_SIZE, pos);
      ctx.stroke();
    }

    // 十字線（中心）
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    const center = CANVAS_SIZE / 2;
    ctx.beginPath();
    ctx.moveTo(center, PADDING);
    ctx.lineTo(center, PADDING + DRAW_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(PADDING, center);
    ctx.lineTo(PADDING + DRAW_SIZE, center);
    ctx.stroke();

    // 輪郭線
    const points = section.points;
    if (points.length < 2) return;

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const first = toCanvas(points[0]);
    ctx.moveTo(first.cx, first.cy);
    for (let i = 1; i < points.length; i++) {
      const p = toCanvas(points[i]);
      ctx.lineTo(p.cx, p.cy);
    }
    ctx.closePath();
    ctx.stroke();

    // 塗りつぶし
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.fill();

    // 頂点
    for (let i = 0; i < points.length; i++) {
      const { cx, cy } = toCanvas(points[i]);
      ctx.beginPath();
      ctx.arc(cx, cy, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = draggingIndex === i ? "#ef4444" : "#3b82f6";
      ctx.fill();
    }

    // 角度ラベル
    ctx.fillStyle = "#666";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${section.angle}° 断面`, PADDING, PADDING - 10);
  }, [section, draggingIndex]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getMousePos = (e: React.MouseEvent): { mx: number; my: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { mx: 0, my: 0 };
    return {
      mx: e.clientX - rect.left,
      my: e.clientY - rect.top,
    };
  };

  const findPointAt = (mx: number, my: number): number | null => {
    for (let i = 0; i < section.points.length; i++) {
      const { cx, cy } = toCanvas(section.points[i]);
      const dx = mx - cx;
      const dy = my - cy;
      if (dx * dx + dy * dy < (POINT_RADIUS + 4) ** 2) return i;
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { mx, my } = getMousePos(e);
    const idx = findPointAt(mx, my);
    if (idx !== null) {
      setDraggingIndex(idx);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingIndex === null) return;
    const { mx, my } = getMousePos(e);
    const newPoint = fromCanvas(mx, my);
    const newPoints = [...section.points];
    newPoints[draggingIndex] = newPoint;
    onChange({ ...section, points: newPoints });
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="cursor-crosshair rounded border"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
