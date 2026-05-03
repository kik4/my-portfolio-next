"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HeadMesh } from "../_lib/types";

interface Props {
  head: HeadMesh;
  // Caller is responsible for committing through the history stack.
  onChange: (next: HeadMesh) => void;
}

// Two side-by-side SVG canvases that edit the head silhouette curves:
//   - Left: front view (X right, Y up). Shows the right half (X >= 0) of the
//     front silhouette as a closed loop mirrored back to X=0 along the
//     midline. Each sample's halfX is a horizontal handle, the Y itself is
//     the vertical position.
//   - Right: side view (Z forward = left, Y up). Shows zFront on the left of
//     the midline and zBack on the right, matching how a face profile is
//     usually drawn (looking at the character's right cheek), with the Y axis
//     common.
//
// All three columns (frontHalfXs, sideZFronts, sideZBacks) share the same Y
// sample list, so dragging a sample's Y in either canvas moves both. To keep
// the UI predictable, we expose Y editing only on the front view; the side
// view's Y is read-only-locked to the matching front-view handle.
//
// The apex (Y max) and chin (Y min) — the first and last entries after
// sorting by Y — used to be locked to a single point (halfX = zFront = zBack
// = 0) so the head capped to a sharp tip. That was abandoned because real
// heads aren't pointy on top and chins aren't pointy at the bottom either.
// Now the poles are draggable like any other sample; they're rendered with
// a slightly different color so the user can still spot the topmost/bottommost
// rings, but no values are clamped.
export const HeadCurveEditor = ({ head, onChange }: Props) => {
  return (
    <div className="flex gap-2">
      <CurveCanvas
        head={head}
        onChange={onChange}
        title="正面 (XY)"
        leftKey="mirroredHalfX"
        rightKey="halfX"
      />
      <CurveCanvas
        head={head}
        onChange={onChange}
        title="側面 (ZY)"
        leftKey="zFront"
        rightKey="zBack"
      />
    </div>
  );
};

type Side = "halfX" | "mirroredHalfX" | "zFront" | "zBack";

interface CurveCanvasProps {
  head: HeadMesh;
  onChange: (next: HeadMesh) => void;
  title: string;
  // Which value drives the negative-X half of the canvas, and which drives
  // the positive-X half. For the front view both halves are mirror images of
  // halfX; the user only sees the right half as draggable, the left mirror
  // updates automatically.
  leftKey: Side;
  rightKey: Side;
}

const WIDTH = 180;
const HEIGHT = 240;

const CurveCanvas = ({
  head,
  onChange,
  title,
  leftKey,
  rightKey,
}: CurveCanvasProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // dragging[0] = sample index, dragging[1] = "left" | "right" | "y"
  const [dragging, setDragging] = useState<{
    sampleIdx: number;
    target: "left" | "right" | "y";
  } | null>(null);

  // View fit: derive bounds from the data so both halves are visible.
  const view = useMemo(() => {
    let maxAbsX = 0.05;
    let minY = Infinity;
    let maxY = -Infinity;
    head.ySamples.forEach((y) => {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
    head.frontHalfXs.forEach((v) => {
      if (Math.abs(v) > maxAbsX) maxAbsX = Math.abs(v);
    });
    head.sideZFronts.forEach((v) => {
      if (Math.abs(v) > maxAbsX) maxAbsX = Math.abs(v);
    });
    head.sideZBacks.forEach((v) => {
      if (Math.abs(v) > maxAbsX) maxAbsX = Math.abs(v);
    });
    const padX = maxAbsX * 0.2;
    const padY = (maxY - minY) * 0.1;
    const w = (maxAbsX + padX) * 2;
    const h = maxY - minY + padY * 2;
    const scale = Math.min(WIDTH / w, HEIGHT / h);
    const cx = WIDTH / 2;
    const midY = (minY + maxY) / 2;
    const cy = HEIGHT / 2 + midY * scale;
    return { cx, cy, scale };
  }, [head]);

  // Sort indices by Y descending so the polyline is drawn top-to-bottom and
  // we can safely mark the first/last as the poles.
  const sortedIndices = useMemo(
    () =>
      [...head.ySamples.keys()].sort(
        (a, b) => head.ySamples[b] - head.ySamples[a],
      ),
    [head.ySamples],
  );
  const apexIdx = sortedIndices[0];
  const chinIdx = sortedIndices[sortedIndices.length - 1];

  // Pixel position helpers.
  const xPx = (xVal: number) => view.cx + xVal * view.scale;
  const yPx = (yVal: number) => view.cy - yVal * view.scale;

  const screenToValue = useCallback(
    (sx: number, sy: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const px = sx - rect.left;
      const py = sy - rect.top;
      return {
        x: (px - view.cx) / view.scale,
        y: -(py - view.cy) / view.scale,
      };
    },
    [view],
  );

  const isPole = useCallback(
    (idx: number) => idx === apexIdx || idx === chinIdx,
    [apexIdx, chinIdx],
  );

  const writeValue = useCallback(
    (
      idx: number,
      target: "left" | "right" | "y",
      value: { x: number; y: number },
    ) => {
      const next: HeadMesh = {
        ...head,
        ySamples: [...head.ySamples],
        frontHalfXs: [...head.frontHalfXs],
        sideZFronts: [...head.sideZFronts],
        sideZBacks: [...head.sideZBacks],
      };
      if (target === "y") {
        next.ySamples[idx] = value.y;
      } else if (target === "right") {
        const v = Math.max(value.x, 0);
        if (rightKey === "halfX") next.frontHalfXs[idx] = v;
        // Side view: right of midline = back of head. Stored as negative Z.
        if (rightKey === "zBack") next.sideZBacks[idx] = -v;
        next.ySamples[idx] = value.y;
      } else if (target === "left") {
        const v = Math.min(value.x, 0);
        if (leftKey === "mirroredHalfX") {
          // Front view's left half mirrors halfX; the canonical halfX is
          // |v|, and X >= 0 in the data model.
          next.frontHalfXs[idx] = Math.abs(v);
        }
        // Side view: left of midline = front of face. Stored as positive Z,
        // so flip the screen-X sign back.
        if (leftKey === "zFront") {
          next.sideZFronts[idx] = -v;
        }
        next.ySamples[idx] = value.y;
      }
      onChange(next);
    },
    [head, onChange, leftKey, rightKey],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      writeValue(
        dragging.sampleIdx,
        dragging.target,
        screenToValue(e.clientX, e.clientY),
      );
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, writeValue, screenToValue]);

  // Build the silhouette path for visualization (closed loop: right side
  // top-to-bottom, then left side bottom-to-top).
  const path = useMemo(() => {
    if (sortedIndices.length === 0) return "";
    const px = (xVal: number) => view.cx + xVal * view.scale;
    const py = (yVal: number) => view.cy - yVal * view.scale;
    const cmds: string[] = [];
    sortedIndices.forEach((idx, j) => {
      const y = head.ySamples[idx];
      const xVal = getCurveValue(head, idx, rightKey);
      cmds.push(
        `${j === 0 ? "M" : "L"} ${px(xVal).toFixed(2)} ${py(y).toFixed(2)}`,
      );
    });
    [...sortedIndices].reverse().forEach((idx) => {
      const y = head.ySamples[idx];
      const xVal = getCurveValue(head, idx, leftKey);
      cmds.push(`L ${px(xVal).toFixed(2)} ${py(y).toFixed(2)}`);
    });
    cmds.push("Z");
    return cmds.join(" ");
  }, [head, sortedIndices, leftKey, rightKey, view]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-gray-500 text-xs">{title}</span>
      <svg
        ref={svgRef}
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block touch-none rounded border bg-white"
        role="img"
        aria-label={`${title} カーブエディタ`}
      >
        {/* Reference cross */}
        <line x1={view.cx} y1={0} x2={view.cx} y2={HEIGHT} stroke="#e5e7eb" />
        <line x1={0} y1={view.cy} x2={WIDTH} y2={view.cy} stroke="#e5e7eb" />
        {/* Silhouette */}
        <path
          d={path}
          fill="rgba(245, 212, 179, 0.3)"
          stroke="#b08868"
          strokeWidth={1.5}
        />
        {/* Handles. Each sample row gets one or two handles plus an invisible
            wider hit-target so they're easy to grab. */}
        {sortedIndices.map((idx) => {
          const y = head.ySamples[idx];
          const right = getCurveValue(head, idx, rightKey);
          const left = getCurveValue(head, idx, leftKey);
          return (
            <g key={`row-${idx}`}>
              {/* Right handle (positive X side). Apex/chin still draggable
                  vertically — the X is clamped to 0 by writeValue. */}
              <Handle
                cx={xPx(right)}
                cy={yPx(y)}
                active={
                  dragging?.sampleIdx === idx && dragging.target === "right"
                }
                pole={isPole(idx)}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.target as SVGElement).setPointerCapture?.(e.pointerId);
                  setDragging({ sampleIdx: idx, target: "right" });
                }}
              />
              {/* Left handle (negative X side). For the front view this is a
                  mirror of the right handle. */}
              <Handle
                cx={xPx(left)}
                cy={yPx(y)}
                active={
                  dragging?.sampleIdx === idx && dragging.target === "left"
                }
                pole={isPole(idx)}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.target as SVGElement).setPointerCapture?.(e.pointerId);
                  setDragging({ sampleIdx: idx, target: "left" });
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Returns the canonical pixel-X-mapped value for sample idx on the given side.
// Note: side view flips Z so the front of the face appears on the left of the
// canvas (matches how a profile is conventionally drawn). zFront is stored as
// a positive Z but rendered as negative X; zBack is stored as negative Z but
// rendered as positive X.
const getCurveValue = (head: HeadMesh, idx: number, side: Side): number => {
  switch (side) {
    case "halfX":
      return head.frontHalfXs[idx];
    case "mirroredHalfX":
      return -head.frontHalfXs[idx];
    case "zFront":
      return -head.sideZFronts[idx];
    case "zBack":
      return -head.sideZBacks[idx];
  }
};

const Handle = ({
  cx,
  cy,
  active,
  pole,
  onPointerDown,
}: {
  cx: number;
  cy: number;
  active: boolean;
  pole: boolean;
  onPointerDown: (e: React.PointerEvent<SVGCircleElement>) => void;
}) => (
  <circle
    cx={cx}
    cy={cy}
    r={pole ? 4 : 5}
    fill={active ? "#1d4ed8" : pole ? "#9ca3af" : "#3b82f6"}
    stroke="white"
    strokeWidth={1.5}
    onPointerDown={onPointerDown}
    style={{ cursor: "grab" }}
  />
);
