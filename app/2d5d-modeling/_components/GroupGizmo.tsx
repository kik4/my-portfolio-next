"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { decomposeMat2, mulMat2 } from "../_lib/mat2utils";
import type {
  FeatureGroup,
  FeatureGroupKeyframe,
  Mat2,
  Point2D,
  Polygon,
  YawPitch,
} from "../_lib/types";
import { MAT2_IDENTITY } from "../_lib/types";

interface GroupGizmoProps {
  group: FeatureGroup;
  polygons: Polygon[];
  angle: YawPitch;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  onUpdateKeyframe: (kf: FeatureGroupKeyframe) => void;
}

const ANGLE_THRESHOLD = 5; // degrees, for matching existing KF

function findOrCreateKf(
  group: FeatureGroup,
  angle: YawPitch,
): FeatureGroupKeyframe {
  // Find existing KF close to current angle
  for (const kf of group.yawPitchKeyframes) {
    const dy = kf.angle.yaw - angle.yaw;
    const dp = kf.angle.pitch - angle.pitch;
    if (Math.sqrt(dy * dy + dp * dp) < ANGLE_THRESHOLD) {
      return kf;
    }
  }
  // Create new
  return {
    angle: { yaw: angle.yaw, pitch: angle.pitch },
    position: [0, 0, 0],
    matrix: MAT2_IDENTITY,
  };
}

function getGroupBBox(
  group: FeatureGroup,
  polygons: Polygon[],
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const members = polygons.filter(
    (p) => p.group === "feature" && p.groupId === group.id,
  );
  if (members.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of members) {
    for (const [x, y] of p.basePoints) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

type DragMode =
  | null
  | { type: "move" }
  | { type: "rotate"; startAngle: number; startRotation: number }
  | { type: "scaleX"; startX: number; startScaleX: number }
  | { type: "scaleY"; startY: number; startScaleY: number }
  | { type: "shear"; startX: number; startShear: number };

export function GroupGizmo({
  group,
  polygons,
  angle,
  zoom,
  canvasWidth,
  canvasHeight,
  onUpdateKeyframe,
}: GroupGizmoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const kfRef = useRef<FeatureGroupKeyframe | null>(null);
  const startMatrixRef = useRef<Mat2>(MAT2_IDENTITY);
  const startPositionRef = useRef<Point2D>([0, 0, 0]);

  const bbox = useMemo(() => getGroupBBox(group, polygons), [group, polygons]);

  // World to screen conversion (orthographic, camera at origin looking -z)
  const toScreen = useCallback(
    (wx: number, wy: number): [number, number] => {
      const sx = canvasWidth / 2 + wx * zoom;
      const sy = canvasHeight / 2 - wy * zoom;
      return [sx, sy];
    },
    [canvasWidth, canvasHeight, zoom],
  );

  const toWorld = useCallback(
    (sx: number, sy: number): [number, number] => {
      const wx = (sx - canvasWidth / 2) / zoom;
      const wy = -(sy - canvasHeight / 2) / zoom;
      return [wx, wy];
    },
    [canvasWidth, canvasHeight, zoom],
  );

  const currentKf = useMemo(() => findOrCreateKf(group, angle), [group, angle]);
  const params = useMemo(() => decomposeMat2(currentKf.matrix), [currentKf]);

  if (!bbox) return null;

  // Apply current KF transform to bbox corners
  const [m00, m01, m10, m11] = currentKf.matrix;
  const [tx, ty] = currentKf.position;
  const transform = (x: number, y: number): [number, number] => [
    m00 * x + m01 * y + tx,
    m10 * x + m11 * y + ty,
  ];

  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;

  // Transformed corners
  const corners = [
    transform(bbox.minX, bbox.minY),
    transform(bbox.maxX, bbox.minY),
    transform(bbox.maxX, bbox.maxY),
    transform(bbox.minX, bbox.maxY),
  ];
  const screenCorners = corners.map(([x, y]) => toScreen(x, y));

  // Transformed center
  const [tcx, tcy] = transform(cx, cy);
  const screenCenter = toScreen(tcx, tcy);

  // Edge midpoints (screen)
  const midBottom = [
    (screenCorners[0][0] + screenCorners[1][0]) / 2,
    (screenCorners[0][1] + screenCorners[1][1]) / 2,
  ];
  const midRight = [
    (screenCorners[1][0] + screenCorners[2][0]) / 2,
    (screenCorners[1][1] + screenCorners[2][1]) / 2,
  ];
  const midTop = [
    (screenCorners[2][0] + screenCorners[3][0]) / 2,
    (screenCorners[2][1] + screenCorners[3][1]) / 2,
  ];
  const midLeft = [
    (screenCorners[3][0] + screenCorners[0][0]) / 2,
    (screenCorners[3][1] + screenCorners[0][1]) / 2,
  ];

  // Rotation handle position (above top edge)
  const rotateHandleScreen: [number, number] = [
    midTop[0] - (screenCorners[3][1] - screenCorners[2][1]) * 0.15,
    midTop[1] - (screenCorners[2][0] - screenCorners[3][0]) * 0.15 - 20,
  ];

  const ensureKf = (): FeatureGroupKeyframe => {
    if (!kfRef.current) {
      kfRef.current = { ...currentKf };
    }
    return kfRef.current;
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    mode: NonNullable<DragMode>,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    kfRef.current = { ...currentKf };
    startMatrixRef.current = [...currentKf.matrix] as Mat2;
    startPositionRef.current = [...currentKf.position] as Point2D;
    setDragMode(mode);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragMode || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const kf = ensureKf();
    const sm = startMatrixRef.current;

    if (dragMode.type === "move") {
      const [wx, wy] = toWorld(sx, sy);
      const [swx, swy] = toWorld(dragStart.current.x, dragStart.current.y);
      const newKf: FeatureGroupKeyframe = {
        ...kf,
        position: [
          startPositionRef.current[0] + (wx - swx),
          startPositionRef.current[1] + (wy - swy),
          0,
        ],
      };
      kfRef.current = newKf;
      onUpdateKeyframe(newKf);
    }

    if (dragMode.type === "rotate") {
      const dx = sx - screenCenter[0];
      const dy = sy - screenCenter[1];
      const currentAngle = (Math.atan2(-dx, -dy) * 180) / Math.PI;
      const deltaRad = ((currentAngle - dragMode.startAngle) * Math.PI) / 180;
      const cos = Math.cos(deltaRad);
      const sin = Math.sin(deltaRad);
      // Left-multiply rotation delta: R_delta * startMatrix
      const newMatrix = mulMat2([cos, sin, -sin, cos], sm);
      const newKf: FeatureGroupKeyframe = { ...kf, matrix: newMatrix };
      kfRef.current = newKf;
      onUpdateKeyframe(newKf);
    }

    if (dragMode.type === "scaleX") {
      const dx = (sx - dragMode.startX) / zoom;
      const ratio =
        Math.max(0.01, dragMode.startScaleX + dx * 2) / dragMode.startScaleX;
      // Right-multiply scale: startMatrix * [ratio, 0, 0, 1]
      const newMatrix = mulMat2(sm, [ratio, 0, 0, 1]);
      const newKf: FeatureGroupKeyframe = { ...kf, matrix: newMatrix };
      kfRef.current = newKf;
      onUpdateKeyframe(newKf);
    }

    if (dragMode.type === "scaleY") {
      const dy = -(sy - dragMode.startY) / zoom;
      const ratio =
        Math.max(0.01, dragMode.startScaleY + dy * 2) / dragMode.startScaleY;
      // Right-multiply scale: startMatrix * [1, 0, 0, ratio]
      const newMatrix = mulMat2(sm, [1, 0, 0, ratio]);
      const newKf: FeatureGroupKeyframe = { ...kf, matrix: newMatrix };
      kfRef.current = newKf;
      onUpdateKeyframe(newKf);
    }

    if (dragMode.type === "shear") {
      const dx = (sx - dragMode.startX) / zoom;
      // Right-multiply shear: startMatrix * [1, delta, 0, 1]
      const newMatrix = mulMat2(sm, [1, dx * 2, 0, 1]);
      const newKf: FeatureGroupKeyframe = { ...kf, matrix: newMatrix };
      kfRef.current = newKf;
      onUpdateKeyframe(newKf);
    }
  };

  const handlePointerUp = () => {
    setDragMode(null);
    kfRef.current = null;
  };

  // Bounding box path
  const boxPath = `M${screenCorners.map(([x, y]) => `${x},${y}`).join(" L")} Z`;

  const HANDLE_R = 5;
  const HANDLE_STYLE_MOVE = {
    fill: "#3b82f6",
    stroke: "white",
    strokeWidth: 2,
  };
  const HANDLE_STYLE_ROTATE = {
    fill: "#f59e0b",
    stroke: "white",
    strokeWidth: 2,
  };
  const HANDLE_STYLE_SCALE = {
    fill: "#10b981",
    stroke: "white",
    strokeWidth: 1.5,
  };
  const HANDLE_STYLE_SHEAR = {
    fill: "#8b5cf6",
    stroke: "white",
    strokeWidth: 1.5,
  };

  const HANDLE_POINTER = "pointer-events-auto";

  return (
    <svg
      ref={svgRef}
      className={`absolute inset-0 h-full w-full ${dragMode ? "pointer-events-auto" : "pointer-events-none"}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="img"
      aria-label="グループ変形ハンドル"
    >
      {/* Bounding box */}
      <path
        d={boxPath}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={1}
        strokeDasharray="4 2"
      />

      {/* Line from center to rotate handle */}
      <line
        x1={midTop[0]}
        y1={midTop[1]}
        x2={rotateHandleScreen[0]}
        y2={rotateHandleScreen[1]}
        stroke="#f59e0b"
        strokeWidth={1}
      />

      {/* Move handle (center) */}
      <circle
        cx={screenCenter[0]}
        cy={screenCenter[1]}
        r={HANDLE_R + 2}
        {...HANDLE_STYLE_MOVE}
        className={`cursor-move ${HANDLE_POINTER}`}
        onPointerDown={(e) => handlePointerDown(e, { type: "move" })}
      />

      {/* Rotate handle (above top) */}
      <circle
        cx={rotateHandleScreen[0]}
        cy={rotateHandleScreen[1]}
        r={HANDLE_R}
        {...HANDLE_STYLE_ROTATE}
        className={`cursor-grab ${HANDLE_POINTER}`}
        onPointerDown={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          const dx = e.clientX - rect.left - screenCenter[0];
          const dy = e.clientY - rect.top - screenCenter[1];
          const startAngle = (Math.atan2(-dx, -dy) * 180) / Math.PI;
          handlePointerDown(e, {
            type: "rotate",
            startAngle,
            startRotation: params.rotation,
          });
        }}
      />

      {/* ScaleX handles (left/right midpoints) */}
      <rect
        x={midRight[0] - 4}
        y={midRight[1] - 4}
        width={8}
        height={8}
        {...HANDLE_STYLE_SCALE}
        className={`cursor-ew-resize ${HANDLE_POINTER}`}
        onPointerDown={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          handlePointerDown(e, {
            type: "scaleX",
            startX: e.clientX - rect.left,
            startScaleX: params.scaleX,
          });
        }}
      />
      <rect
        x={midLeft[0] - 4}
        y={midLeft[1] - 4}
        width={8}
        height={8}
        {...HANDLE_STYLE_SCALE}
        className={`cursor-ew-resize ${HANDLE_POINTER}`}
        onPointerDown={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          handlePointerDown(e, {
            type: "scaleX",
            startX: e.clientX - rect.left,
            startScaleX: params.scaleX,
          });
        }}
      />

      {/* ScaleY handles (top/bottom midpoints) */}
      <rect
        x={midTop[0] - 4}
        y={midTop[1] - 4}
        width={8}
        height={8}
        {...HANDLE_STYLE_SCALE}
        className={`cursor-ns-resize ${HANDLE_POINTER}`}
        onPointerDown={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          handlePointerDown(e, {
            type: "scaleY",
            startY: e.clientY - rect.top,
            startScaleY: params.scaleY,
          });
        }}
      />
      <rect
        x={midBottom[0] - 4}
        y={midBottom[1] - 4}
        width={8}
        height={8}
        {...HANDLE_STYLE_SCALE}
        className={`cursor-ns-resize ${HANDLE_POINTER}`}
        onPointerDown={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          handlePointerDown(e, {
            type: "scaleY",
            startY: e.clientY - rect.top,
            startScaleY: params.scaleY,
          });
        }}
      />

      {/* Shear handles (corners top-left, top-right) */}
      <polygon
        points={`${screenCorners[2][0] - 3},${screenCorners[2][1] - 6} ${screenCorners[2][0] + 3},${screenCorners[2][1] - 6} ${screenCorners[2][0]},${screenCorners[2][1]}`}
        {...HANDLE_STYLE_SHEAR}
        className={`cursor-e-resize ${HANDLE_POINTER}`}
        onPointerDown={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          handlePointerDown(e, {
            type: "shear",
            startX: e.clientX - rect.left,
            startShear: params.shear,
          });
        }}
      />
      <polygon
        points={`${screenCorners[3][0] - 3},${screenCorners[3][1] - 6} ${screenCorners[3][0] + 3},${screenCorners[3][1] - 6} ${screenCorners[3][0]},${screenCorners[3][1]}`}
        {...HANDLE_STYLE_SHEAR}
        className={`cursor-e-resize ${HANDLE_POINTER}`}
        onPointerDown={(e) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          handlePointerDown(e, {
            type: "shear",
            startX: e.clientX - rect.left,
            startShear: params.shear,
          });
        }}
      />

      {/* Active KF indicator */}
      <text
        x={screenCenter[0] + 12}
        y={screenCenter[1] - 12}
        fill="#3b82f6"
        fontSize={10}
      >
        {group.yawPitchKeyframes.some((kf) => {
          const dy = kf.angle.yaw - angle.yaw;
          const dp = kf.angle.pitch - angle.pitch;
          return Math.sqrt(dy * dy + dp * dp) < ANGLE_THRESHOLD;
        })
          ? `KF (${angle.yaw.toFixed(0)}°, ${angle.pitch.toFixed(0)}°)`
          : `新規KF (${angle.yaw.toFixed(0)}°, ${angle.pitch.toFixed(0)}°)`}
      </text>
    </svg>
  );
}
