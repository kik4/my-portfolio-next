"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ColorRGBA, Point2D } from "../_lib/types";

interface BackgroundPolygon {
  points: Point2D[];
  fillColor: ColorRGBA;
}

interface PointEditorProps {
  points: Point2D[];
  fillColor: ColorRGBA;
  backgroundPolygons?: BackgroundPolygon[];
  onChange: (points: Point2D[]) => void;
  viewSize?: number;
}

function rgbaToCss(c: ColorRGBA): string {
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${c[3]})`;
}

const CANVAS_PX = 480;

type DragState =
  | null
  | { type: "point"; index: number }
  | { type: "move"; lastSx: number; lastSy: number }
  | {
      type: "scale";
      axis: "x" | "y" | "xy";
      startSx: number;
      startSy: number;
      center: Point2D;
      startPoints: Point2D[];
    };

export function PointEditor({
  points,
  fillColor,
  backgroundPolygons = [],
  onChange,
  viewSize = 0.5,
}: PointEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState>(null);

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

  const getSvgPos = useCallback((e: React.PointerEvent): [number, number] => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return [0, 0];
    return [
      ((e.clientX - rect.left) / rect.width) * CANVAS_PX,
      ((e.clientY - rect.top) / rect.height) * CANVAS_PX,
    ];
  }, []);

  // Bounding box in world coords
  const bbox = useMemo(() => {
    if (points.length === 0) return null;
    let minX = points[0][0];
    let minY = points[0][1];
    let maxX = points[0][0];
    let maxY = points[0][1];
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
  }, [points]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!drag) return;
      const [sx, sy] = getSvgPos(e);

      if (drag.type === "point") {
        const next = points.slice();
        next[drag.index] = toWorld(sx, sy);
        onChange(next);
      }

      if (drag.type === "move") {
        const [wx, wy] = toWorld(sx, sy);
        const [lwx, lwy] = toWorld(drag.lastSx, drag.lastSy);
        const dx = wx - lwx;
        const dy = wy - lwy;
        onChange(points.map(([px, py]) => [px + dx, py + dy]));
        setDrag({ type: "move", lastSx: sx, lastSy: sy });
      }

      if (drag.type === "scale") {
        const [wx, wy] = toWorld(sx, sy);
        const [swx, swy] = toWorld(drag.startSx, drag.startSy);
        const cx = drag.center[0];
        const cy = drag.center[1];
        const startDx = swx - cx;
        const startDy = swy - cy;
        const curDx = wx - cx;
        const curDy = wy - cy;

        const scaleX =
          drag.axis === "y"
            ? 1
            : Math.abs(startDx) > 0.0001
              ? curDx / startDx
              : 1;
        const scaleY =
          drag.axis === "x"
            ? 1
            : Math.abs(startDy) > 0.0001
              ? curDy / startDy
              : 1;

        onChange(
          drag.startPoints.map(([px, py]) => [
            cx + (px - cx) * scaleX,
            cy + (py - cy) * scaleY,
          ]),
        );
      }
    },
    [drag, points, onChange, toWorld, getSvgPos],
  );

  const handlePointerUp = useCallback(() => {
    setDrag(null);
  }, []);

  const pathD = `${points
    .map((p, i) => {
      const [sx, sy] = toScreen(p);
      return `${i === 0 ? "M" : "L"}${sx},${sy}`;
    })
    .join(" ")} Z`;

  // Bbox screen coords for scale handles
  const bboxScreen = bbox
    ? {
        tl: toScreen([bbox.minX, bbox.maxY]),
        tr: toScreen([bbox.maxX, bbox.maxY]),
        bl: toScreen([bbox.minX, bbox.minY]),
        br: toScreen([bbox.maxX, bbox.minY]),
      }
    : null;

  const startScale = (e: React.PointerEvent, axis: "x" | "y" | "xy") => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [sx, sy] = getSvgPos(e);
    const cx = bbox ? (bbox.minX + bbox.maxX) / 2 : 0;
    const cy = bbox ? (bbox.minY + bbox.maxY) / 2 : 0;
    setDrag({
      type: "scale",
      axis,
      startSx: sx,
      startSy: sy,
      center: [cx, cy],
      startPoints: points.map(([x, y]) => [x, y]),
    });
  };

  const HANDLE_SIZE = 6;

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
      {backgroundPolygons.map((bg) => {
        const bgD = `${bg.points
          .map((p, i) => {
            const [sx, sy] = toScreen(p);
            return `${i === 0 ? "M" : "L"}${sx},${sy}`;
          })
          .join(" ")} Z`;
        return (
          <path
            key={`bg-${bg.fillColor.join(",")}-${bg.points.length}`}
            d={bgD}
            fill={rgbaToCss([
              bg.fillColor[0],
              bg.fillColor[1],
              bg.fillColor[2],
              0.25,
            ])}
            stroke={rgbaToCss([
              bg.fillColor[0],
              bg.fillColor[1],
              bg.fillColor[2],
              0.4,
            ])}
            strokeWidth={1}
          />
        );
      })}
      <path
        d={pathD}
        fill={rgbaToCss(fillColor)}
        stroke="#b45309"
        strokeWidth={1.5}
        className="cursor-move"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const [sx, sy] = getSvgPos(e);
          setDrag({ type: "move", lastSx: sx, lastSy: sy });
        }}
      />

      {/* Scale handles on bbox edges */}
      {bboxScreen && (
        <>
          {/* Bbox outline */}
          <rect
            x={bboxScreen.tl[0]}
            y={bboxScreen.tl[1]}
            width={bboxScreen.tr[0] - bboxScreen.tl[0]}
            height={bboxScreen.bl[1] - bboxScreen.tl[1]}
            fill="none"
            stroke="#9ca3af"
            strokeWidth={0.5}
            strokeDasharray="3 2"
          />
          {/* Right (scaleX) */}
          <rect
            x={bboxScreen.tr[0] - HANDLE_SIZE / 2}
            y={(bboxScreen.tr[1] + bboxScreen.br[1]) / 2 - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#10b981"
            stroke="white"
            strokeWidth={1}
            className="cursor-ew-resize"
            onPointerDown={(e) => startScale(e, "x")}
          />
          {/* Left (scaleX) */}
          <rect
            x={bboxScreen.tl[0] - HANDLE_SIZE / 2}
            y={(bboxScreen.tl[1] + bboxScreen.bl[1]) / 2 - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#10b981"
            stroke="white"
            strokeWidth={1}
            className="cursor-ew-resize"
            onPointerDown={(e) => startScale(e, "x")}
          />
          {/* Top (scaleY) */}
          <rect
            x={(bboxScreen.tl[0] + bboxScreen.tr[0]) / 2 - HANDLE_SIZE / 2}
            y={bboxScreen.tl[1] - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#10b981"
            stroke="white"
            strokeWidth={1}
            className="cursor-ns-resize"
            onPointerDown={(e) => startScale(e, "y")}
          />
          {/* Bottom (scaleY) */}
          <rect
            x={(bboxScreen.bl[0] + bboxScreen.br[0]) / 2 - HANDLE_SIZE / 2}
            y={bboxScreen.bl[1] - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#10b981"
            stroke="white"
            strokeWidth={1}
            className="cursor-ns-resize"
            onPointerDown={(e) => startScale(e, "y")}
          />
          {/* Corners (scaleXY) */}
          <rect
            x={bboxScreen.tr[0] - HANDLE_SIZE / 2}
            y={bboxScreen.tr[1] - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#f59e0b"
            stroke="white"
            strokeWidth={1}
            className="cursor-nwse-resize"
            onPointerDown={(e) => startScale(e, "xy")}
          />
          <rect
            x={bboxScreen.bl[0] - HANDLE_SIZE / 2}
            y={bboxScreen.bl[1] - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#f59e0b"
            stroke="white"
            strokeWidth={1}
            className="cursor-nwse-resize"
            onPointerDown={(e) => startScale(e, "xy")}
          />
          <rect
            x={bboxScreen.tl[0] - HANDLE_SIZE / 2}
            y={bboxScreen.tl[1] - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#f59e0b"
            stroke="white"
            strokeWidth={1}
            className="cursor-nesw-resize"
            onPointerDown={(e) => startScale(e, "xy")}
          />
          <rect
            x={bboxScreen.br[0] - HANDLE_SIZE / 2}
            y={bboxScreen.br[1] - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#f59e0b"
            stroke="white"
            strokeWidth={1}
            className="cursor-nesw-resize"
            onPointerDown={(e) => startScale(e, "xy")}
          />
        </>
      )}

      {/* Point handles */}
      {points.map((p, i) => {
        const [sx, sy] = toScreen(p);
        return (
          <circle
            key={`${p[0]},${p[1]}`}
            cx={sx}
            cy={sy}
            r={6}
            fill={
              drag?.type === "point" && drag.index === i ? "#ef4444" : "#2563eb"
            }
            stroke="white"
            strokeWidth={2}
            className="cursor-grab"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrag({ type: "point", index: i });
            }}
          />
        );
      })}
    </svg>
  );
}
