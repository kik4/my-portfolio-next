"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type AffineMatrix, applyAffine } from "../_lib/affine";
import type { Vec2 } from "../_lib/types";

interface Props {
  affine: AffineMatrix;
  onChange: (next: AffineMatrix) => void;
  // Optional shape to draw as backdrop. If absent (e.g. group editing) a
  // dashed unit square is shown instead.
  shape?: { basePoints: Vec2[]; closed: boolean };
}

const W = 240;
const H = 240;
const PADDING = 24;

// 2D editor for a 2x3 affine matrix [a, b, c, d, tx, ty]. Three draggable
// handles drive every component directly:
//   - center ● at (tx, ty) — translation
//   - red ■ at (tx + a, ty + b) — X-basis endpoint
//   - green ■ at (tx + c, ty + d) — Y-basis endpoint
//
// Dragging a basis handle changes that column of the 2x2; dragging the
// center moves the translation. No decomposition into scale/rotate/shear is
// needed — the user sees and edits the matrix's geometric meaning directly.
export const AffineGizmo2D = ({ affine, onChange, shape }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<"origin" | "x" | "y" | null>(null);

  const [a, b, c, d, tx, ty] = affine;

  // Auto-fit: compute the world-space bbox of "the things we want visible"
  // (the basis endpoints, the origin, and the transformed shape) and pick
  // a uniform scale so they all fit with PADDING.
  const view = useMemo(() => {
    const points: Vec2[] = [
      [0, 0],
      [tx, ty],
      [tx + a, ty + b],
      [tx + c, ty + d],
    ];
    if (shape) {
      for (const p of shape.basePoints) {
        points.push(applyAffine(affine, p));
      }
    }
    let minX = -0.3;
    let maxX = 0.3;
    let minY = -0.3;
    let maxY = 0.3;
    for (const [px, py] of points) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const sx = (W - 2 * PADDING) / w;
    const sy = (H - 2 * PADDING) / h;
    const scale = Math.min(sx, sy);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tCx = W / 2 - cx * scale;
    const tCy = H / 2 + cy * scale;
    return { scale, tCx, tCy };
  }, [affine, shape, a, b, c, d, tx, ty]);

  const toScreen = (x: number, y: number): [number, number] => [
    x * view.scale + view.tCx,
    -y * view.scale + view.tCy,
  ];
  const toWorld = (sx: number, sy: number): Vec2 => [
    (sx - view.tCx) / view.scale,
    -(sy - view.tCy) / view.scale,
  ];

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const [wx, wy] = toWorld(e.clientX - rect.left, e.clientY - rect.top);
      if (dragging === "origin") {
        onChange([a, b, c, d, wx, wy]);
      } else if (dragging === "x") {
        onChange([wx - tx, wy - ty, c, d, tx, ty]);
      } else if (dragging === "y") {
        onChange([a, b, wx - tx, wy - ty, tx, ty]);
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  });

  // Backdrop: transformed shape (filled) or a dashed unit square.
  // toScreen is recomputed each render but cheap; inlining the projection
  // here avoids tripping the exhaustive-deps rule on a closure dependency.
  const backdrop = useMemo(() => {
    const project = (p: Vec2) => {
      const [tx2, ty2] = applyAffine(affine, p);
      return [
        tx2 * view.scale + view.tCx,
        -ty2 * view.scale + view.tCy,
      ] as const;
    };
    if (shape && shape.basePoints.length >= 3) {
      const pts = shape.basePoints.map((p) => project(p).join(",")).join(" ");
      return (
        <polygon
          points={pts}
          fill="rgba(80,140,200,0.18)"
          stroke="#6e9ec8"
          strokeWidth={1}
        />
      );
    }
    const corners: Vec2[] = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ];
    const pts = corners.map((p) => project(p).join(",")).join(" ");
    return (
      <polygon
        points={pts}
        fill="none"
        stroke="#9ca3af"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
    );
  }, [affine, shape, view]);

  const [originSx, originSy] = toScreen(tx, ty);
  const [xSx, xSy] = toScreen(tx + a, ty + b);
  const [ySx, ySy] = toScreen(tx + c, ty + d);
  const [zeroSx, zeroSy] = toScreen(0, 0);

  return (
    <fieldset className="rounded border bg-white p-2">
      <legend className="text-gray-700">アフィン編集 (2D)</legend>
      <p className="mb-1 text-[10px] text-gray-500">
        ●原点をドラッグで平行移動 / 赤・緑をドラッグで X/Y 基底
      </p>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="アフィン編集キャンバス"
        className="block touch-none rounded border bg-gray-50"
      >
        {/* World origin crosshair */}
        <line x1={zeroSx} y1={0} x2={zeroSx} y2={H} stroke="#e5e7eb" />
        <line x1={0} y1={zeroSy} x2={W} y2={zeroSy} stroke="#e5e7eb" />
        {backdrop}
        {/* Basis arrows from translated origin */}
        <line
          x1={originSx}
          y1={originSy}
          x2={xSx}
          y2={xSy}
          stroke="#dc2626"
          strokeWidth={1.5}
        />
        <line
          x1={originSx}
          y1={originSy}
          x2={ySx}
          y2={ySy}
          stroke="#16a34a"
          strokeWidth={1.5}
        />
        {/* Origin handle */}
        {/* biome-ignore lint/a11y/useSemanticElements: SVG circle used as drag target */}
        <circle
          cx={originSx}
          cy={originSy}
          r={6}
          fill={dragging === "origin" ? "#1d4ed8" : "#3b82f6"}
          stroke="white"
          strokeWidth={1.5}
          role="button"
          aria-label="原点 (translate)"
          style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            e.preventDefault();
            setDragging("origin");
          }}
        />
        {/* X basis handle (red square) */}
        {/* biome-ignore lint/a11y/useSemanticElements: SVG rect used as drag target */}
        <rect
          x={xSx - 5}
          y={xSy - 5}
          width={10}
          height={10}
          fill={dragging === "x" ? "#991b1b" : "#dc2626"}
          stroke="white"
          strokeWidth={1.5}
          role="button"
          aria-label="X 基底"
          style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            e.preventDefault();
            setDragging("x");
          }}
        />
        {/* Y basis handle (green square) */}
        {/* biome-ignore lint/a11y/useSemanticElements: SVG rect used as drag target */}
        <rect
          x={ySx - 5}
          y={ySy - 5}
          width={10}
          height={10}
          fill={dragging === "y" ? "#166534" : "#16a34a"}
          stroke="white"
          strokeWidth={1.5}
          role="button"
          aria-label="Y 基底"
          style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            e.preventDefault();
            setDragging("y");
          }}
        />
      </svg>
      <details className="mt-1">
        <summary className="cursor-pointer text-[10px] text-gray-500">
          現在の行列 [a, b, c, d, tx, ty]
        </summary>
        <div className="mt-1 grid grid-cols-3 gap-1 font-mono text-[10px]">
          {affine.map((v, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: column is its identity
            <span key={i}>{v.toFixed(3)}</span>
          ))}
        </div>
      </details>
    </fieldset>
  );
};
