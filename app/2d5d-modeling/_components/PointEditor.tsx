"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PartShape, Vec2 } from "../_lib/types";

interface Props {
  shape: PartShape;
  // Receives the next shape (closed polygon or open polyline). Caller is
  // responsible for committing through the history stack.
  onChange: (next: PartShape) => void;
  // Pixel size of the SVG canvas. The view is auto-fit to the shape extents.
  width?: number;
  height?: number;
}

// 2D drag editor for a part's local XY shape. Renders the polygon with one
// handle per control point. Drag a handle to move it. Click on an edge to
// insert a new point at the click location. Right-click a handle to remove it.
//
// Coordinate convention: SVG y-axis is flipped so that local +Y maps to
// screen-up (matches the 3D scene's convention).
export const PointEditor = ({
  shape,
  onChange,
  width = 240,
  height = 200,
}: Props) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  // Frozen view extents so dragging doesn't make the camera jitter as the
  // shape grows. Recomputed when the shape's identity changes (e.g. selecting
  // a different part) but stable during a drag session.
  const view = useMemo(
    () => fitView(shape.basePoints, width, height),
    [shape, width, height],
  );

  // Convert from SVG pixel coords to local shape coords.
  const screenToLocal = useCallback(
    (sx: number, sy: number): Vec2 => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return [0, 0];
      const px = sx - rect.left;
      const py = sy - rect.top;
      // SVG y-axis is flipped: screen-up = local +Y.
      const lx = (px - view.cx) / view.scale;
      const ly = -(py - view.cy) / view.scale;
      return [lx, ly];
    },
    [view],
  );

  // Pointer-move + pointer-up listeners are attached to the window during a
  // drag so the cursor can leave the SVG without losing the drag.
  useEffect(() => {
    if (draggingIdx === null) return;
    const onMove = (e: PointerEvent) => {
      const local = screenToLocal(e.clientX, e.clientY);
      const next = shape.basePoints.map(
        (p, i) => (i === draggingIdx ? local : p) as Vec2,
      );
      onChange({ ...shape, basePoints: next });
    };
    const onUp = () => setDraggingIdx(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingIdx, shape, onChange, screenToLocal]);

  const handleEdgeClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // Insert a new control point at the click location, snapping into the
    // nearest segment so the new point lies on the polyline (cleaner UX than
    // appending at the end). Only triggers when not dragging.
    if (draggingIdx !== null) return;
    const target = e.target as SVGElement;
    if (target.dataset.handle !== undefined) return; // ignore handle clicks
    const local = screenToLocal(e.clientX, e.clientY);
    const insertAt = nearestSegmentInsertIndex(shape, local);
    const next: Vec2[] = [
      ...shape.basePoints.slice(0, insertAt),
      local,
      ...shape.basePoints.slice(insertAt),
    ];
    onChange({ ...shape, basePoints: next });
  };

  const handleRemove = (i: number) => {
    if (shape.basePoints.length <= 3) return; // keep enough points to triangulate
    onChange({
      ...shape,
      basePoints: shape.basePoints.filter((_, idx) => idx !== i),
    });
  };

  const path = buildSvgPath(shape, view);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: pointer-only direct manipulation surface
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      onClick={handleEdgeClick}
      className="block touch-none rounded border bg-white"
      role="application"
      aria-label="形状エディタ"
    >
      {/* Reference cross at the local origin */}
      <line
        x1={view.cx}
        y1={0}
        x2={view.cx}
        y2={height}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
      <line
        x1={0}
        y1={view.cy}
        x2={width}
        y2={view.cy}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
      {/* Polygon outline + soft fill */}
      <path
        d={path}
        fill="rgba(59, 130, 246, 0.15)"
        stroke="#3b82f6"
        strokeWidth={1.5}
      />
      {/* Control handles */}
      {shape.basePoints.map((p, i) => {
        const x = view.cx + p[0] * view.scale;
        const y = view.cy - p[1] * view.scale;
        // Stable per-point keys so React's reconciler tracks dragging cleanly.
        // The point coordinate alone isn't unique (two points may overlap during
        // editing), so we mix in the index — biome warns about that, suppressed
        // because the index *is* the identity of a control point.
        const key = `pt-${i}`;
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: SVG handle for pointer-based editing
          <circle
            key={key}
            cx={x}
            cy={y}
            r={5}
            fill={draggingIdx === i ? "#1d4ed8" : "#3b82f6"}
            stroke="white"
            strokeWidth={1.5}
            data-handle={i}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as SVGElement).setPointerCapture?.(e.pointerId);
              setDraggingIdx(i);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              handleRemove(i);
            }}
            style={{ cursor: "grab" }}
          />
        );
      })}
    </svg>
  );
};

interface ViewFit {
  cx: number;
  cy: number;
  scale: number; // pixels per local unit
}

const fitView = (points: Vec2[], width: number, height: number): ViewFit => {
  if (points.length === 0) {
    return { cx: width / 2, cy: height / 2, scale: 100 };
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
  // Pad the bounding box by 50% so handles don't sit on the edge.
  const padX = Math.max((maxX - minX) * 0.5, 0.05);
  const padY = Math.max((maxY - minY) * 0.5, 0.05);
  const w = maxX - minX + padX * 2;
  const h = maxY - minY + padY * 2;
  const scale = Math.min(width / w, height / h);
  // Center the bounding box's midpoint in the view.
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const cx = width / 2 - midX * scale;
  const cy = height / 2 + midY * scale; // y inverted
  return { cx, cy, scale };
};

const buildSvgPath = (shape: PartShape, view: ViewFit): string => {
  if (shape.basePoints.length === 0) return "";
  const cmds: string[] = [];
  shape.basePoints.forEach((p, i) => {
    const x = view.cx + p[0] * view.scale;
    const y = view.cy - p[1] * view.scale;
    cmds.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  });
  if (shape.closed) cmds.push("Z");
  return cmds.join(" ");
};

// Returns the insertion index that places `point` between the two existing
// points of the closest polyline segment. For closed shapes the wrap segment
// is considered too. For an empty list, returns 0.
const nearestSegmentInsertIndex = (shape: PartShape, point: Vec2): number => {
  const pts = shape.basePoints;
  if (pts.length === 0) return 0;
  if (pts.length === 1) return 1;
  let bestIdx = pts.length;
  let bestDist = Infinity;
  const segCount = shape.closed ? pts.length : pts.length - 1;
  for (let i = 0; i < segCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const d = pointSegmentDistanceSq(point, a, b);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i + 1;
    }
  }
  return bestIdx;
};

const pointSegmentDistanceSq = (p: Vec2, a: Vec2, b: Vec2): number => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const px = p[0] - a[0];
    const py = p[1] - a[1];
    return px * px + py * py;
  }
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a[0] + t * dx;
  const cy = a[1] + t * dy;
  const ex = p[0] - cx;
  const ey = p[1] - cy;
  return ex * ex + ey * ey;
};
