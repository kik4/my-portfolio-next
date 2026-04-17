"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { subdivideClosed } from "../_lib/catmullRom";
import type { ColorRGBA, Point2D, StrokeRange } from "../_lib/types";

interface BackgroundPolygon {
  points: Point2D[];
  fillColor: ColorRGBA;
}

interface PointEditorProps {
  points: Point2D[];
  fillColor: ColorRGBA;
  fillEnabled?: boolean;
  strokeColor?: ColorRGBA | null;
  strokeWidth?: number;
  backgroundPolygons?: BackgroundPolygon[];
  backgroundColor?: string;
  allowAddRemove?: boolean;
  onChange: (points: Point2D[]) => void;
  viewSize?: number;
  // Stroke range editing (feature polygons only). When editMode is true,
  // clicking control points sets start then end to form a new range.
  strokeRanges?: StrokeRange[] | null;
  strokeRangesEditMode?: boolean;
  onStrokeRangesChange?: (ranges: StrokeRange[] | null) => void;
}

function rgbaToCss(c: ColorRGBA): string {
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${c[3]})`;
}

const CANVAS_PX = 480;
const SUBDIV_SEGMENTS = 8;

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
    }
  | {
      type: "rotate";
      startAngle: number;
      center: Point2D;
      startPoints: Point2D[];
    };

/** Distance from point (px,py) to line segment (ax,ay)-(bx,by) in SVG coords */
function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { dist: number; t: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const d = Math.hypot(px - ax, py - ay);
    return { dist: d, t: 0 };
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return { dist: Math.hypot(px - projX, py - projY), t };
}

export function PointEditor({
  points,
  fillColor,
  backgroundPolygons = [],
  fillEnabled = true,
  strokeColor = null,
  strokeWidth = 2,
  backgroundColor = "#ffffff",
  allowAddRemove = true,
  onChange,
  viewSize: initialViewSize = 0.5,
  strokeRanges = null,
  strokeRangesEditMode = false,
  onStrokeRangesChange,
}: PointEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [viewSize, setViewSize] = useState(initialViewSize);
  const [pendingStart, setPendingStart] = useState<number | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setViewSize((prev) => {
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      return Math.max(0.05, Math.min(5, prev * factor));
    });
  }, []);

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
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const inv = ctm.inverse();
    return [
      e.clientX * inv.a + e.clientY * inv.c + inv.e,
      e.clientX * inv.b + e.clientY * inv.d + inv.f,
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

      if (drag.type === "rotate") {
        const [wx, wy] = toWorld(sx, sy);
        const cx = drag.center[0];
        const cy = drag.center[1];
        const currentAngle = Math.atan2(wy - cy, wx - cx);
        const deltaRad = currentAngle - drag.startAngle;
        const cos = Math.cos(deltaRad);
        const sin = Math.sin(deltaRad);
        onChange(
          drag.startPoints.map(([px, py]) => {
            const dx = px - cx;
            const dy = py - cy;
            return [cx + cos * dx - sin * dy, cy + sin * dx + cos * dy];
          }),
        );
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

  const smoothPoints = useMemo(
    () =>
      points.length >= 3 ? subdivideClosed(points, SUBDIV_SEGMENTS) : points,
    [points],
  );

  const pathD = `${smoothPoints
    .map((p, i) => {
      const [sx, sy] = toScreen(p);
      return `${i === 0 ? "M" : "L"}${sx},${sy}`;
    })
    .join(" ")} Z`;

  // Stroke range highlight paths (for feature polygons with partial strokes)
  const strokeRangePaths = useMemo(() => {
    if (!strokeRanges || strokeRanges.length === 0) return [];
    const nCp = points.length;
    if (nCp < 3) return [];
    const total = smoothPoints.length;
    if (total === 0) return [];
    const paths: string[] = [];
    for (const r of strokeRanges) {
      const a = ((r.start % nCp) + nCp) % nCp;
      const b = ((r.end % nCp) + nCp) % nCp;
      if (a === b) continue;
      const startV = a * SUBDIV_SEGMENTS;
      const endV = b * SUBDIV_SEGMENTS;
      const parts: string[] = [];
      let i = startV;
      for (let step = 0; step <= total; step++) {
        const p = smoothPoints[i % total];
        const [sx, sy] = toScreen(p);
        parts.push(`${step === 0 ? "M" : "L"}${sx},${sy}`);
        if (i % total === endV % total && step > 0) break;
        i++;
      }
      paths.push(parts.join(" "));
    }
    return paths;
  }, [strokeRanges, smoothPoints, points.length, toScreen]);

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

  const startRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [sx, sy] = getSvgPos(e);
    const cx = bbox ? (bbox.minX + bbox.maxX) / 2 : 0;
    const cy = bbox ? (bbox.minY + bbox.maxY) / 2 : 0;
    const [wx, wy] = toWorld(sx, sy);
    setDrag({
      type: "rotate",
      startAngle: Math.atan2(wy - cy, wx - cx),
      center: [cx, cy],
      startPoints: points.map(([x, y]) => [x, y]),
    });
  };

  const HANDLE_SIZE = 6;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS_PX} ${CANVAS_PX}`}
      className="h-full w-full touch-none select-none"
      style={{ backgroundColor }}
      onWheel={handleWheel}
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
        const bgSmooth =
          bg.points.length >= 3
            ? subdivideClosed(bg.points, SUBDIV_SEGMENTS)
            : bg.points;
        const bgD = `${bgSmooth
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
        fill={fillEnabled ? rgbaToCss(fillColor) : "transparent"}
        stroke={
          strokeColor && strokeRanges === null ? rgbaToCss(strokeColor) : "none"
        }
        strokeWidth={strokeColor && strokeRanges === null ? strokeWidth : 0}
        className="cursor-move"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const [sx, sy] = getSvgPos(e);
          setDrag({ type: "move", lastSx: sx, lastSy: sy });
        }}
      />

      {/* Partial stroke highlight */}
      {strokeColor &&
        strokeRangePaths.map((d) => (
          <path
            key={`sr-${d}`}
            d={d}
            fill="none"
            stroke={rgbaToCss(strokeColor)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            pointerEvents="none"
          />
        ))}

      {/* Stroke range edit mode overlay highlight (pending start) */}
      {strokeRangesEditMode &&
        pendingStart !== null &&
        points[pendingStart] && (
          <circle
            cx={toScreen(points[pendingStart])[0]}
            cy={toScreen(points[pendingStart])[1]}
            r={10}
            fill="none"
            stroke="#f97316"
            strokeWidth={2}
            pointerEvents="none"
          />
        )}

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
          {/* Rotate handle (above top edge, separated from scaleY handle) */}
          {(() => {
            const tx = (bboxScreen.tl[0] + bboxScreen.tr[0]) / 2;
            const ty = bboxScreen.tl[1] - 32;
            return (
              <>
                <line
                  x1={(bboxScreen.tl[0] + bboxScreen.tr[0]) / 2}
                  y1={bboxScreen.tl[1]}
                  x2={tx}
                  y2={ty}
                  stroke="#f59e0b"
                  strokeWidth={1}
                />
                <circle
                  cx={tx}
                  cy={ty}
                  r={HANDLE_SIZE / 2 + 1}
                  fill="#f59e0b"
                  stroke="white"
                  strokeWidth={1.5}
                  className="cursor-grab"
                  onPointerDown={startRotate}
                />
              </>
            );
          })()}
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

      {/* Edge hit areas for inserting points */}
      {allowAddRemove &&
        points.length >= 2 &&
        points.map((p, i) => {
          const next = points[(i + 1) % points.length];
          const [sx1, sy1] = toScreen(p);
          const [sx2, sy2] = toScreen(next);
          return (
            <line
              key={`edge-${p[0]},${p[1]}-${next[0]},${next[1]}`}
              x1={sx1}
              y1={sy1}
              x2={sx2}
              y2={sy2}
              stroke="transparent"
              strokeWidth={12}
              className="cursor-copy"
              onPointerDown={(e) => {
                e.stopPropagation();
                const [sx, sy] = getSvgPos(e);
                const [ax, ay] = toScreen(p);
                const [bx, by] = toScreen(next);
                const { t } = distToSegment(sx, sy, ax, ay, bx, by);
                const wx = p[0] + t * (next[0] - p[0]);
                const wy = p[1] + t * (next[1] - p[1]);
                const newPoints = [...points];
                newPoints.splice(i + 1, 0, [wx, wy]);
                onChange(newPoints);
              }}
            />
          );
        })}

      {/* Point handles */}
      {points.map((p, i) => {
        const [sx, sy] = toScreen(p);
        const inEditMode = strokeRangesEditMode;
        // Hue cycles with index so adjacent points differ yet stay readable.
        const hue = points.length > 0 ? (i / points.length) * 360 : 0;
        const indexColor = `hsl(${hue.toFixed(0)}, 70%, 45%)`;
        const fill = inEditMode
          ? pendingStart === i
            ? "#f97316"
            : "#8b5cf6"
          : drag?.type === "point" && drag.index === i
            ? "#ef4444"
            : indexColor;
        return (
          // biome-ignore lint/a11y/useSemanticElements: SVG circle used as interactive handle
          <circle
            key={`${p[0]},${p[1]}`}
            cx={sx}
            cy={sy}
            r={6}
            fill={fill}
            stroke="white"
            strokeWidth={2}
            className={inEditMode ? "cursor-pointer" : "cursor-grab"}
            role="button"
            tabIndex={-1}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (inEditMode) {
                if (pendingStart === null) {
                  setPendingStart(i);
                } else {
                  const next: StrokeRange = {
                    id: `sr_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
                    start: pendingStart,
                    end: i,
                  };
                  const existing = strokeRanges ?? [];
                  onStrokeRangesChange?.([...existing, next]);
                  setPendingStart(null);
                }
                return;
              }
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrag({ type: "point", index: i });
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (inEditMode) {
                setPendingStart(null);
                return;
              }
              if (!allowAddRemove) return;
              if (points.length <= 3) return;
              const newPoints = points.filter((_, j) => j !== i);
              onChange(newPoints);
            }}
          />
        );
      })}
    </svg>
  );
}
