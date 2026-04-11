"use client";

import { useCallback, useState } from "react";
import type { FaceModel, Point2D } from "../_lib/types";
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

export function ModelingTool() {
  const [outlinePoints, setOutlinePoints] = useState<Point2D[]>(() =>
    createInitialFaceOutline(),
  );
  const [referenceVisible, setReferenceVisible] = useState(true);
  const [referenceOpacity, setReferenceOpacity] = useState(0.5);
  const [faceOpacity, setFaceOpacity] = useState(1);
  const [angle, setAngle] = useState<{ yaw: number; pitch: number }>({
    yaw: 0,
    pitch: 0,
  });
  const [zoom, setZoom] = useState(600);

  const handleAngleChange = useCallback((yaw: number, pitch: number) => {
    setAngle({ yaw, pitch });
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const model: FaceModel = {
    polygons: [
      {
        id: "faceOutline",
        group: "outline",
        basePoints: outlinePoints,
        layerIndex: 0,
        fillColor: [0.99, 0.88, 0.78, 1],
      },
    ],
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-[480px] shrink-0 flex-col border-r bg-white">
        <div className="border-b px-4 py-2 font-semibold text-sm">
          正面ベース点列（顔輪郭）
        </div>
        <div className="flex-1">
          <PointEditor points={outlinePoints} onChange={setOutlinePoints} />
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
