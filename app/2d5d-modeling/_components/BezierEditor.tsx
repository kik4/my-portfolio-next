"use client";

import { useCallback, useRef, useState } from "react";
import type { BezierAnchor, Part, Point2D } from "./types";
import { partToStrokePath, partToSvgPath } from "./types";

const VIEWBOX_SIZE = 400;

type DragTarget =
  | { kind: "anchor"; index: number }
  | { kind: "handleIn"; index: number }
  | { kind: "handleOut"; index: number }
  | { kind: "translate"; startX: number; startY: number }
  | null;

interface BezierEditorProps {
  part: Part;
  onChange: (part: Part) => void;
}

export function BezierEditor({ part, onChange }: BezierEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<DragTarget>(null);

  const getSvgPoint = useCallback(
    (e: React.PointerEvent | PointerEvent): Point2D => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * VIEWBOX_SIZE;
      const y = ((e.clientY - rect.top) / rect.height) * VIEWBOX_SIZE;
      return { x, y };
    },
    [],
  );

  const handlePointerDown = (target: DragTarget) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(target);
  };

  const handlePathPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const { x, y } = getSvgPoint(e);
    setDragging({ kind: "translate", startX: x, startY: y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const { x, y } = getSvgPoint(e);

    if (dragging.kind === "translate") {
      const dx = x - dragging.startX;
      const dy = y - dragging.startY;
      const anchors = part.anchors.map((a) => ({
        ...a,
        position: { x: a.position.x + dx, y: a.position.y + dy },
      }));
      setDragging({ kind: "translate", startX: x, startY: y });
      onChange({ ...part, anchors });
      return;
    }

    const anchors: BezierAnchor[] = part.anchors.map((a, i) => {
      if (i !== dragging.index) return a;
      if (dragging.kind === "anchor") {
        return { ...a, position: { x, y } };
      }
      if (dragging.kind === "handleIn") {
        return {
          ...a,
          handleIn: { x: x - a.position.x, y: y - a.position.y },
        };
      }
      return {
        ...a,
        handleOut: { x: x - a.position.x, y: y - a.position.y },
      };
    });
    onChange({ ...part, anchors });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    setDragging(null);
  };

  const fillD = partToSvgPath(part);
  const strokeD = partToStrokePath(part);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      className="w-full select-none rounded border bg-white"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <title>Bezier editor</title>

      {/* グリッド */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="#eee"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill="url(#grid)" />
      <line
        x1={VIEWBOX_SIZE / 2}
        y1={0}
        x2={VIEWBOX_SIZE / 2}
        y2={VIEWBOX_SIZE}
        stroke="#ddd"
      />
      <line
        x1={0}
        y1={VIEWBOX_SIZE / 2}
        x2={VIEWBOX_SIZE}
        y2={VIEWBOX_SIZE / 2}
        stroke="#ddd"
      />

      {/* 塗り（ドラッグで移動可能） */}
      <path
        d={fillD}
        fill={part.fillColor ?? "none"}
        stroke="#ccc"
        strokeWidth={1}
        strokeDasharray="4 3"
        className="cursor-move"
        onPointerDown={handlePathPointerDown}
      />
      {/* 実際の線（strokeNextがtrueのセグメントのみ） */}
      {strokeD && (
        <path
          d={strokeD}
          fill="none"
          stroke={part.strokeColor}
          strokeWidth={part.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}

      {/* ハンドル */}
      {part.anchors.map((a, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: アンカーは配列順でしか識別できない
        <g key={i}>
          <line
            x1={a.position.x}
            y1={a.position.y}
            x2={a.position.x + a.handleIn.x}
            y2={a.position.y + a.handleIn.y}
            stroke="#888"
            strokeWidth={1}
          />
          <line
            x1={a.position.x}
            y1={a.position.y}
            x2={a.position.x + a.handleOut.x}
            y2={a.position.y + a.handleOut.y}
            stroke="#888"
            strokeWidth={1}
          />
          {/* ハンドルIn */}
          <circle
            cx={a.position.x + a.handleIn.x}
            cy={a.position.y + a.handleIn.y}
            r={4}
            fill="#888"
            className="cursor-grab"
            onPointerDown={handlePointerDown({ kind: "handleIn", index: i })}
          />
          {/* ハンドルOut */}
          <circle
            cx={a.position.x + a.handleOut.x}
            cy={a.position.y + a.handleOut.y}
            r={4}
            fill="#888"
            className="cursor-grab"
            onPointerDown={handlePointerDown({ kind: "handleOut", index: i })}
          />
          {/* アンカー（shift+クリックで strokeNext をトグル） */}
          <circle
            cx={a.position.x}
            cy={a.position.y}
            r={6}
            fill={a.strokeNext !== false ? "#3b82f6" : "#cbd5e1"}
            stroke="#fff"
            strokeWidth={1.5}
            className="cursor-grab"
            onPointerDown={(e) => {
              if (e.shiftKey) {
                e.stopPropagation();
                const anchors = part.anchors.map((aa, idx) =>
                  idx === i
                    ? { ...aa, strokeNext: aa.strokeNext === false }
                    : aa,
                );
                onChange({ ...part, anchors });
                return;
              }
              handlePointerDown({ kind: "anchor", index: i })(e);
            }}
          />
        </g>
      ))}
    </svg>
  );
}
