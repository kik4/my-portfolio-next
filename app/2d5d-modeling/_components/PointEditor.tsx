"use client";

import { useCallback, useRef, useState } from "react";
import type { ColorRGBA, Point2D } from "../_lib/types";

interface PointEditorProps {
  points: Point2D[];
  fillColor: ColorRGBA;
  onChange: (points: Point2D[]) => void;
  viewSize?: number;
}

function rgbaToCss(c: ColorRGBA): string {
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${c[3]})`;
}

const CANVAS_PX = 480;

export function PointEditor({
  points,
  fillColor,
  onChange,
  viewSize = 0.5,
}: PointEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const toScreen = useCallback(
    (p: Point2D): [number, number] => {
      const sx = ((p[0] + viewSize) / (viewSize * 2)) * CANVAS_PX;
      const sy = ((viewSize - p[1]) / (viewSize * 2)) * CANVAS_PX;
      return [sx, sy];
    },
    [viewSize],
  );

  const toWorld = useCallback(
    (sx: number, sy: number): Point2D => {
      const x = (sx / CANVAS_PX) * (viewSize * 2) - viewSize;
      const y = viewSize - (sy / CANVAS_PX) * (viewSize * 2);
      return [x, y];
    },
    [viewSize],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (draggingIndex === null || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * CANVAS_PX;
      const sy = ((e.clientY - rect.top) / rect.height) * CANVAS_PX;
      const next = points.slice();
      next[draggingIndex] = toWorld(sx, sy);
      onChange(next);
    },
    [draggingIndex, points, onChange, toWorld],
  );

  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const pathD = `${points
    .map((p, i) => {
      const [sx, sy] = toScreen(p);
      return `${i === 0 ? "M" : "L"}${sx},${sy}`;
    })
    .join(" ")} Z`;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS_PX} ${CANVAS_PX}`}
      className="h-full w-full touch-none select-none bg-white"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="img"
      aria-label="正面ベース点列エディタ"
    >
      <line
        x1={CANVAS_PX / 2}
        y1={0}
        x2={CANVAS_PX / 2}
        y2={CANVAS_PX}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
      <line
        x1={0}
        y1={CANVAS_PX / 2}
        x2={CANVAS_PX}
        y2={CANVAS_PX / 2}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
      <path
        d={pathD}
        fill={rgbaToCss(fillColor)}
        stroke="#b45309"
        strokeWidth={1.5}
      />
      {points.map((p, i) => {
        const [sx, sy] = toScreen(p);
        return (
          <circle
            key={`${p[0]},${p[1]}`}
            cx={sx}
            cy={sy}
            r={6}
            fill={draggingIndex === i ? "#ef4444" : "#2563eb"}
            stroke="white"
            strokeWidth={2}
            className="cursor-grab"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDraggingIndex(i);
            }}
          />
        );
      })}
    </svg>
  );
}
