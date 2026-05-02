"use client";

import type { FaceModel } from "../_lib/types";
import { Scene } from "./Scene";

interface Props {
  model: FaceModel;
  showAxes: boolean;
  showGrid: boolean;
  onCameraChange: (yaw: number, pitch: number) => void;
}

// Fixed mini view configurations. Each renders a small Scene at a frozen
// camera angle so the user can confirm "looks good from every angle" without
// having to orbit the main view back and forth.
const MINI_VIEWS = [
  { label: "正面", yaw: 0, pitch: 0 },
  { label: "3/4", yaw: 30, pitch: 5 },
  { label: "横", yaw: 90, pitch: 0 },
  { label: "上", yaw: 0, pitch: 60 },
] as const;

export const MultiView = ({
  model,
  showAxes,
  showGrid,
  onCameraChange,
}: Props) => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Strip of mini views across the top, fixed height */}
      <div className="flex h-32 shrink-0 gap-1 border-b bg-gray-100 p-1">
        {MINI_VIEWS.map((v) => (
          <div
            key={v.label}
            className="relative flex h-full flex-1 overflow-hidden rounded border bg-white"
          >
            <Scene
              model={model}
              showAxes={false}
              showGrid={false}
              fixedView={{ yaw: v.yaw, pitch: v.pitch }}
            />
            <span className="pointer-events-none absolute top-0.5 left-1 text-[10px] text-gray-600">
              {v.label} ({v.yaw}°, {v.pitch}°)
            </span>
          </div>
        ))}
      </div>
      {/* Main interactive view fills the rest */}
      <div className="min-h-0 flex-1">
        <Scene
          model={model}
          showAxes={showAxes}
          showGrid={showGrid}
          onCameraChange={onCameraChange}
        />
      </div>
    </div>
  );
};
