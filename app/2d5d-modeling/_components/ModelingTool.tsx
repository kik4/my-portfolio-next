"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  FaceModel,
  OutlineKeyframe,
  Point2D,
  YawPitch,
} from "../_lib/types";
import { PointEditor } from "./PointEditor";
import { ReferenceScene } from "./ReferenceScene";
import { Scene } from "./Scene";

function createInitialFaceOutline(): Point2D[] {
  const points: Point2D[] = [];
  const n = 16;
  const rx = 0.3;
  const ry = 0.4;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    points.push([Math.sin(t) * rx, Math.cos(t) * ry]);
  }
  return points;
}

type EditMode = { type: "base" } | { type: "keyframe"; index: number };

export function ModelingTool() {
  const [basePoints, setBasePoints] = useState<Point2D[]>(() =>
    createInitialFaceOutline(),
  );
  const [keyframes, setKeyframes] = useState<OutlineKeyframe[]>([]);
  const [editMode, setEditMode] = useState<EditMode>({ type: "base" });

  const [referenceVisible, setReferenceVisible] = useState(true);
  const [referenceOpacity, setReferenceOpacity] = useState(0.5);
  const [faceOpacity, setFaceOpacity] = useState(1);
  const [angle, setAngle] = useState<YawPitch>({ yaw: 0, pitch: 0 });
  const [zoom, setZoom] = useState(600);

  const handleAngleChange = useCallback((yaw: number, pitch: number) => {
    setAngle({ yaw, pitch });
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  // Points shown in editor: base or base+delta
  const editorPoints = useMemo(() => {
    if (editMode.type === "base") return basePoints;
    const kf = keyframes[editMode.index];
    if (!kf) return basePoints;
    return basePoints.map(
      ([bx, by], i) =>
        [
          bx + (kf.deltas[i]?.[0] ?? 0),
          by + (kf.deltas[i]?.[1] ?? 0),
        ] as Point2D,
    );
  }, [editMode, basePoints, keyframes]);

  const handleEditorChange = useCallback(
    (newPoints: Point2D[]) => {
      if (editMode.type === "base") {
        setBasePoints(newPoints);
      } else {
        const kfIndex = editMode.index;
        setKeyframes((prev) =>
          prev.map((kf, i) => {
            if (i !== kfIndex) return kf;
            const deltas: Point2D[] = newPoints.map(([px, py], j) => [
              px - basePoints[j][0],
              py - basePoints[j][1],
            ]);
            return { ...kf, deltas };
          }),
        );
      }
    },
    [editMode, basePoints],
  );

  const addKeyframe = useCallback(() => {
    const deltas: Point2D[] = basePoints.map(() => [0, 0]);
    const newKf: OutlineKeyframe = {
      angle: { yaw: angle.yaw, pitch: angle.pitch },
      deltas,
    };
    setKeyframes((prev) => [...prev, newKf]);
    setEditMode({ type: "keyframe", index: keyframes.length });
  }, [angle, basePoints, keyframes.length]);

  const deleteKeyframe = useCallback(
    (index: number) => {
      setKeyframes((prev) => prev.filter((_, i) => i !== index));
      if (editMode.type === "keyframe") {
        if (editMode.index === index) {
          setEditMode({ type: "base" });
        } else if (editMode.index > index) {
          setEditMode({ type: "keyframe", index: editMode.index - 1 });
        }
      }
    },
    [editMode],
  );

  const model: FaceModel = {
    polygons: [
      {
        id: "faceOutline",
        group: "outline",
        basePoints,
        layerIndex: 0,
        fillColor: [0.99, 0.88, 0.78, 1],
        yawPitchKeyframes: keyframes,
      },
    ],
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-120 shrink-0 flex-col border-r bg-white">
        <div className="border-b px-4 py-2 font-semibold text-sm">
          {editMode.type === "base"
            ? "正面ベース点列（顔輪郭）"
            : `キーフレーム ${editMode.index + 1} (${keyframes[editMode.index]?.angle.yaw.toFixed(0)}°, ${keyframes[editMode.index]?.angle.pitch.toFixed(0)}°)`}
        </div>
        <div className="flex-1">
          <PointEditor points={editorPoints} onChange={handleEditorChange} />
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto border-t px-4 py-3 text-sm">
          <div className="font-semibold">キーフレーム</div>
          <button
            type="button"
            onClick={() => setEditMode({ type: "base" })}
            className={`w-full rounded px-2 py-1 text-left ${
              editMode.type === "base"
                ? "bg-blue-100 font-semibold text-blue-800"
                : "hover:bg-gray-100"
            }`}
          >
            正面 (ベース)
          </button>
          {keyframes.map((kf, i) => (
            <div
              key={`${kf.angle.yaw},${kf.angle.pitch}`}
              className="flex items-center gap-1"
            >
              <button
                type="button"
                onClick={() => setEditMode({ type: "keyframe", index: i })}
                className={`flex-1 rounded px-2 py-1 text-left ${
                  editMode.type === "keyframe" && editMode.index === i
                    ? "bg-blue-100 font-semibold text-blue-800"
                    : "hover:bg-gray-100"
                }`}
              >
                ({kf.angle.yaw.toFixed(0)}°, {kf.angle.pitch.toFixed(0)}°)
              </button>
              <button
                type="button"
                onClick={() => deleteKeyframe(i)}
                className="rounded px-1 text-red-500 hover:bg-red-50"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addKeyframe}
            className="w-full rounded border border-gray-400 border-dashed px-2 py-1 text-gray-600 hover:bg-gray-50"
          >
            + 現在の角度 ({angle.yaw.toFixed(0)}°, {angle.pitch.toFixed(0)}°)
            でキーフレーム追加
          </button>
        </div>
        <div className="space-y-3 border-t px-4 py-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={referenceVisible}
              onChange={(e) => setReferenceVisible(e.target.checked)}
            />
            <span>参考3Dモデルを表示</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-24 shrink-0">参考モデル</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={referenceOpacity}
              onChange={(e) => setReferenceOpacity(Number(e.target.value))}
              disabled={!referenceVisible}
              className="flex-1"
            />
            <span className="w-10 text-right tabular-nums">
              {referenceOpacity.toFixed(2)}
            </span>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-24 shrink-0">顔ポリゴン</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={faceOpacity}
              onChange={(e) => setFaceOpacity(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-10 text-right tabular-nums">
              {faceOpacity.toFixed(2)}
            </span>
          </label>
          <div className="text-gray-600">
            yaw: {angle.yaw.toFixed(1)}°, pitch: {angle.pitch.toFixed(1)}°
          </div>
        </div>
      </div>
      <div className="relative h-full min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-0">
          <ReferenceScene
            yaw={angle.yaw}
            pitch={angle.pitch}
            zoom={zoom}
            opacity={referenceOpacity}
            visible={referenceVisible}
          />
        </div>
        <div className="absolute inset-0">
          <Scene
            model={model}
            angle={angle}
            faceOpacity={faceOpacity}
            zoom={zoom}
            onAngleChange={handleAngleChange}
            onZoomChange={handleZoomChange}
          />
        </div>
      </div>
    </div>
  );
}
