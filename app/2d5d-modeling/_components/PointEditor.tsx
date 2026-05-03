"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PartShape, Vec2 } from "../_lib/types";

interface Props {
  shape: PartShape;
  onMovePoint: (index: number, next: Vec2) => void;
  onAddPoint: (insertIndex: number, position: Vec2) => void;
  onRemovePoint: (index: number) => void;
}

const W = 240;
const H = 200;
const PADDING = 20;

// 2D drag editor for a part's basePoints. Coordinates: local +Y maps to
// screen up (we flip the SVG y axis). The view auto-fits to the bbox of the
// points, with PADDING px breathing room.
//
// Interactions:
//   - drag a handle to move that point
//   - click a segment (line) to insert a new point at the click location
//   - right-click a handle to remove (when there are 4+ points)
export const PointEditor = ({
  shape,
  onMovePoint,
  onAddPoint,
  onRemovePoint,
}: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Auto-fit bbox of basePoints to the SVG viewport.
  const bbox = useMemo(() => computeBBox(shape.basePoints), [shape.basePoints]);
  const transform = useMemo(() => makeTransform(bbox), [bbox]);

  const screenToLocal = (sx: number, sy: number): Vec2 => {
    const x = (sx - transform.tx) / transform.sx;
    // y is flipped: screen-down is local -y
    const y = -(sy - transform.ty) / transform.sx;
    return [x, y];
  };
  const localToScreen = (x: number, y: number): [number, number] => [
    x * transform.sx + transform.tx,
    -y * transform.sx + transform.ty,
  ];

  // While dragging, listen on window so the point keeps following the cursor
  // even if it leaves the SVG.
  useEffect(() => {
    if (draggingIndex === null) return;
    const onMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const [lx, ly] = screenToLocal(sx, sy);
      onMovePoint(draggingIndex, [lx, ly]);
    };
    const onUp = () => setDraggingIndex(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  });

  const onSegmentClick = (segIdx: number, e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const local = screenToLocal(sx, sy);
    // segIdx i means the segment from point i to point i+1, so insert at i+1.
    onAddPoint(segIdx + 1, local);
  };

  const points = shape.basePoints;
  const polylinePoints = points
    .map((p) => {
      const [sx, sy] = localToScreen(p[0], p[1]);
      return `${sx},${sy}`;
    })
    .join(" ");
  const closedPath = shape.closed
    ? `${polylinePoints} ${
        points.length > 0
          ? localToScreen(points[0][0], points[0][1]).join(",")
          : ""
      }`
    : polylinePoints;

  return (
    <svg
      ref={svgRef}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="パーツ形状エディタ"
      className="rounded border bg-white"
    >
      {/* Cross-hair reference at local origin */}
      <line x1={transform.tx} y1={0} x2={transform.tx} y2={H} stroke="#eee" />
      <line x1={0} y1={transform.ty} x2={W} y2={transform.ty} stroke="#eee" />
      {/* Segments first, so handles draw on top */}
      {points.map((p, i) => {
        if (!shape.closed && i === points.length - 1) return null;
        const next = points[(i + 1) % points.length];
        const [x1, y1] = localToScreen(p[0], p[1]);
        const [x2, y2] = localToScreen(next[0], next[1]);
        return (
          // biome-ignore lint/a11y/useSemanticElements: <line> is an SVG element and cannot be a <button>
          <line
            // biome-ignore lint/suspicious/noArrayIndexKey: segment index is the only stable identity here
            key={`seg-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#888"
            strokeWidth={2}
            style={{ cursor: "copy" }}
            role="button"
            aria-label={`セグメント ${i} をクリックで点追加`}
            onClick={(e) => onSegmentClick(i, e)}
          />
        );
      })}
      {/* Polyline overlay (no events) for clarity */}
      <polyline
        points={closedPath}
        fill="none"
        stroke="#444"
        strokeWidth={1}
        pointerEvents="none"
      />
      {/* Handles */}
      {points.map((p, i) => {
        const [x, y] = localToScreen(p[0], p[1]);
        return (
          // biome-ignore lint/a11y/useSemanticElements: <circle> is an SVG element and cannot be a <button>
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: control point index is its identity
            key={`pt-${i}`}
            cx={x}
            cy={y}
            r={5}
            fill={i === draggingIndex ? "#0080ff" : "#3070d0"}
            stroke="#fff"
            strokeWidth={1.5}
            style={{ cursor: "grab" }}
            role="button"
            aria-label={`shape point ${i}`}
            onPointerDown={(e) => {
              e.preventDefault();
              setDraggingIndex(i);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (points.length > 3) onRemovePoint(i);
            }}
          />
        );
      })}
    </svg>
  );
};

interface BBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const computeBBox = (points: Vec2[]): BBox => {
  if (points.length === 0) {
    return { minX: -0.1, maxX: 0.1, minY: -0.1, maxY: 0.1 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  // Pad zero-extent axes so we don't divide by 0 below.
  if (maxX - minX < 1e-6) {
    minX -= 0.05;
    maxX += 0.05;
  }
  if (maxY - minY < 1e-6) {
    minY -= 0.05;
    maxY += 0.05;
  }
  return { minX, maxX, minY, maxY };
};

interface Transform {
  // Uniform scale (local units → pixels).
  sx: number;
  // Translate (offset in pixels) so the bbox center maps to the SVG center.
  tx: number;
  ty: number;
}

const makeTransform = (bbox: BBox): Transform => {
  const w = bbox.maxX - bbox.minX;
  const h = bbox.maxY - bbox.minY;
  const fitW = (W - 2 * PADDING) / w;
  const fitH = (H - 2 * PADDING) / h;
  const sx = Math.min(fitW, fitH);
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const tx = W / 2 - cx * sx;
  // Note: y is flipped at use, so center stays as W/2 horizontally and
  // H/2 vertically.
  const ty = H / 2 + cy * sx;
  return { sx, tx, ty };
};
