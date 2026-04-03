"use client";

import type { Keyframe, SpritePosition } from "./types";
import { createKeyframeFromCurrent, interpolateKeyframes } from "./types";

const H_ANGLE_PRESETS = [0, 15, 30, 45, 60, 75, 90, 120, 150, 180] as const;
const V_ANGLE_PRESETS = [-90, -45, -15, 0, 15, 45, 90] as const;

type PartKey = "leftEye" | "rightEye" | "leftBrow" | "rightBrow";
const PART_LABELS: Record<PartKey, string> = {
  leftEye: "左目",
  rightEye: "右目",
  leftBrow: "左眉",
  rightBrow: "右眉",
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <div className="flex items-center gap-2">
      <label
        className="w-8 shrink-0 text-gray-600 text-xs"
        htmlFor={`range-${label}`}
      >
        {label}
      </label>
      <input
        id={`range-${label}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 flex-1 accent-blue-500"
      />
      <span className="w-14 text-right text-gray-500 text-xs tabular-nums">
        {value.toFixed(3)}
      </span>
    </div>
  );
}

function PartEditor({
  label,
  position,
  onChange,
}: {
  label: string;
  position: SpritePosition;
  onChange: (pos: SpritePosition) => void;
}) {
  return (
    <div>
      <h4 className="mb-1 font-semibold text-gray-600 text-xs">{label}</h4>
      <div className="flex flex-col gap-1">
        <Slider
          label="X"
          value={position.x}
          min={-0.1}
          max={0.1}
          step={0.001}
          onChange={(v) => onChange({ ...position, x: v })}
        />
        <Slider
          label="Y"
          value={position.y}
          min={-0.1}
          max={0.1}
          step={0.001}
          onChange={(v) => onChange({ ...position, y: v })}
        />
        <Slider
          label="Z"
          value={position.z}
          min={-0.05}
          max={0.15}
          step={0.001}
          onChange={(v) => onChange({ ...position, z: v })}
        />
        <Slider
          label="大"
          value={position.scale}
          min={0.002}
          max={0.05}
          step={0.001}
          onChange={(v) => onChange({ ...position, scale: v })}
        />
        <Slider
          label="回"
          value={position.rotation}
          min={-30}
          max={30}
          step={1}
          onChange={(v) => onChange({ ...position, rotation: v })}
        />
      </div>
    </div>
  );
}

interface ParameterPanelProps {
  keyframes: Keyframe[];
  cameraAngle: { h: number; v: number };
  fixedAngle: { h: number; v: number } | null;
  selectedKeyframeIndex: number | null;
  onKeyframesChange: (keyframes: Keyframe[]) => void;
  onFixedAngleChange: (angle: { h: number; v: number } | null) => void;
  onSelectKeyframe: (index: number | null) => void;
}

export function ParameterPanel({
  keyframes,
  cameraAngle,
  fixedAngle,
  selectedKeyframeIndex,
  onKeyframesChange,
  onFixedAngleChange,
  onSelectKeyframe,
}: ParameterPanelProps) {
  const selectedKeyframe =
    selectedKeyframeIndex !== null ? keyframes[selectedKeyframeIndex] : null;

  function updateSelectedKeyframe(updated: Keyframe) {
    if (selectedKeyframeIndex === null) return;
    const next = [...keyframes];
    next[selectedKeyframeIndex] = updated;
    onKeyframesChange(next);
  }

  function addKeyframeAtCurrentAngle() {
    const angle = Math.round(fixedAngle?.h ?? cameraAngle.h);
    const exists = keyframes.find((kf) => kf.angle === angle);
    if (exists) return;
    const current = interpolateKeyframes(keyframes, angle);
    const kf = createKeyframeFromCurrent(angle, current);
    const next = [...keyframes, kf].sort((a, b) => a.angle - b.angle);
    onKeyframesChange(next);
    onSelectKeyframe(next.findIndex((k) => k.angle === angle));
  }

  function removeSelectedKeyframe() {
    if (selectedKeyframeIndex === null) return;
    const next = keyframes.filter((_, i) => i !== selectedKeyframeIndex);
    onKeyframesChange(next);
    onSelectKeyframe(null);
  }

  return (
    <div className="flex w-80 flex-col gap-3 overflow-y-auto border-l bg-white p-4 text-sm">
      {/* カメラ角度 */}
      <div className="rounded-lg bg-gray-50 p-3">
        <div>
          <div className="flex items-center justify-between">
            <div className="text-gray-500 text-xs">水平</div>
            <div className="font-bold text-gray-800 tabular-nums">
              {(fixedAngle?.h ?? cameraAngle.h).toFixed(0)}°
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={fixedAngle?.h ?? Math.round(cameraAngle.h)}
            onChange={(e) =>
              onFixedAngleChange({
                h: parseFloat(e.target.value),
                v: fixedAngle?.v ?? cameraAngle.v,
              })
            }
            className="h-1.5 w-full accent-blue-500"
          />
          <div className="mt-1 flex flex-wrap gap-1 text-gray-400 text-xs">
            {H_ANGLE_PRESETS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() =>
                  onFixedAngleChange({
                    h: a,
                    v: fixedAngle?.v ?? cameraAngle.v,
                  })
                }
                className="hover:text-blue-500"
              >
                {a}°
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <div className="text-gray-500 text-xs">垂直</div>
            <div className="font-bold text-gray-800 tabular-nums">
              {(fixedAngle?.v ?? cameraAngle.v).toFixed(0)}°
            </div>
          </div>
          <input
            type="range"
            min={-90}
            max={90}
            step={1}
            value={fixedAngle?.v ?? Math.round(cameraAngle.v)}
            onChange={(e) =>
              onFixedAngleChange({
                h: fixedAngle?.h ?? cameraAngle.h,
                v: parseFloat(e.target.value),
              })
            }
            className="h-1.5 w-full accent-blue-500"
          />
          <div className="mt-1 flex flex-wrap gap-1 text-gray-400 text-xs">
            {V_ANGLE_PRESETS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() =>
                  onFixedAngleChange({
                    h: fixedAngle?.h ?? cameraAngle.h,
                    v: a,
                  })
                }
                className="hover:text-blue-500"
              >
                {a}°
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* キーフレーム一覧 */}
      <div className="rounded-lg bg-gray-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-semibold text-gray-700 text-xs">
            キーフレーム
          </div>
          <button
            type="button"
            onClick={addKeyframeAtCurrentAngle}
            className="rounded bg-blue-500 px-2 py-0.5 text-white text-xs hover:bg-blue-600"
          >
            + 追加
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {keyframes.map((kf, i) => (
            <button
              key={kf.angle}
              type="button"
              onClick={() => {
                onSelectKeyframe(i);
                onFixedAngleChange({ h: kf.angle, v: fixedAngle?.v ?? 0 });
              }}
              className={`rounded px-2 py-0.5 text-xs ${
                selectedKeyframeIndex === i
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {kf.angle}°
            </button>
          ))}
        </div>
      </div>

      {/* 選択中のキーフレーム編集 */}
      {selectedKeyframe && (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-700 text-xs">
              {selectedKeyframe.angle}° の配置
            </div>
            <button
              type="button"
              onClick={removeSelectedKeyframe}
              className="rounded px-2 py-0.5 text-red-500 text-xs hover:bg-red-50"
            >
              削除
            </button>
          </div>
          {(Object.keys(PART_LABELS) as PartKey[]).map((part) => (
            <PartEditor
              key={part}
              label={PART_LABELS[part]}
              position={selectedKeyframe[part]}
              onChange={(pos) =>
                updateSelectedKeyframe({ ...selectedKeyframe, [part]: pos })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
