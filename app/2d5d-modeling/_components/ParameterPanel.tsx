"use client";

import type { AutoOffsetParams, BrowParams, EyeParams } from "./types";

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
        className="w-20 shrink-0 text-gray-600 text-xs"
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
      <span className="w-12 text-right text-gray-500 text-xs tabular-nums">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

const H_ANGLE_PRESETS = [0, 15, 30, 45, 60, 75, 90, 120, 150, 180] as const;
const V_ANGLE_PRESETS = [-90, -45, -15, 0, 15, 45, 90] as const;

interface ParameterPanelProps {
  eyeParams: EyeParams;
  browParams: BrowParams;
  autoOffset: AutoOffsetParams;
  cameraAngle: { h: number; v: number };
  fixedAngle: { h: number; v: number } | null;
  onEyeChange: (params: EyeParams) => void;
  onBrowChange: (params: BrowParams) => void;
  onAutoOffsetChange: (params: AutoOffsetParams) => void;
  onFixedAngleChange: (angle: { h: number; v: number } | null) => void;
}

export function ParameterPanel({
  eyeParams,
  browParams,
  autoOffset,
  cameraAngle,
  fixedAngle,
  onEyeChange,
  onBrowChange,
  onAutoOffsetChange,
  onFixedAngleChange,
}: ParameterPanelProps) {
  return (
    <div className="flex w-72 flex-col gap-4 overflow-y-auto border-l bg-white p-4 text-sm">
      {/* カメラ情報 */}
      <div className="rounded-lg bg-gray-50 p-3">
        <div className="mt-2">
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
          <div className="mt-1 flex justify-between text-gray-400 text-xs">
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
          <div className="mt-1 flex justify-between text-gray-400 text-xs">
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

      {/* 自動オフセット */}
      <div className="rounded-lg bg-gray-50 p-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={autoOffset.enabled}
            onChange={(e) =>
              onAutoOffsetChange({ ...autoOffset, enabled: e.target.checked })
            }
            className="accent-blue-500"
          />
          <span className="font-semibold text-gray-700 text-xs">
            自動オフセット
          </span>
        </label>
        {autoOffset.enabled && (
          <div className="mt-2 flex flex-col gap-1.5">
            <Slider
              label="水平強度"
              value={autoOffset.horizontalStrength}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) =>
                onAutoOffsetChange({ ...autoOffset, horizontalStrength: v })
              }
            />
            <Slider
              label="サイズ強度"
              value={autoOffset.scaleStrength}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) =>
                onAutoOffsetChange({ ...autoOffset, scaleStrength: v })
              }
            />
            <Slider
              label="間隔強度"
              value={autoOffset.spacingStrength}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) =>
                onAutoOffsetChange({ ...autoOffset, spacingStrength: v })
              }
            />
          </div>
        )}
      </div>

      {/* 目の配置 */}
      <div>
        <h3 className="mb-2 border-b pb-1 font-semibold text-gray-700 text-xs">
          目の配置
        </h3>
        <div className="flex flex-col gap-1.5">
          <Slider
            label="水平位置"
            value={eyeParams.horizontalOffset}
            min={-0.03}
            max={0.03}
            step={0.001}
            onChange={(v) => onEyeChange({ ...eyeParams, horizontalOffset: v })}
          />
          <Slider
            label="垂直位置"
            value={eyeParams.verticalOffset}
            min={-0.02}
            max={2}
            step={0.001}
            onChange={(v) => onEyeChange({ ...eyeParams, verticalOffset: v })}
          />
          <Slider
            label="間隔"
            value={eyeParams.spacing}
            min={0.003}
            max={0.04}
            step={0.001}
            onChange={(v) => onEyeChange({ ...eyeParams, spacing: v })}
          />
          <Slider
            label="サイズ"
            value={eyeParams.scale}
            min={0.005}
            max={0.05}
            step={0.001}
            onChange={(v) => onEyeChange({ ...eyeParams, scale: v })}
          />
          <Slider
            label="回転"
            value={eyeParams.rotation}
            min={-30}
            max={30}
            step={1}
            onChange={(v) => onEyeChange({ ...eyeParams, rotation: v })}
          />
        </div>
      </div>

      {/* 眉の配置 */}
      <div>
        <h3 className="mb-2 border-b pb-1 font-semibold text-gray-700 text-xs">
          眉の配置
        </h3>
        <div className="flex flex-col gap-1.5">
          <Slider
            label="水平位置"
            value={browParams.horizontalOffset}
            min={-0.03}
            max={0.03}
            step={0.001}
            onChange={(v) =>
              onBrowChange({ ...browParams, horizontalOffset: v })
            }
          />
          <Slider
            label="垂直位置"
            value={browParams.verticalOffset}
            min={-0.02}
            max={0.03}
            step={0.001}
            onChange={(v) => onBrowChange({ ...browParams, verticalOffset: v })}
          />
          <Slider
            label="間隔"
            value={browParams.spacing}
            min={0.003}
            max={0.04}
            step={0.001}
            onChange={(v) => onBrowChange({ ...browParams, spacing: v })}
          />
          <Slider
            label="回転"
            value={browParams.rotation}
            min={-30}
            max={30}
            step={1}
            onChange={(v) => onBrowChange({ ...browParams, rotation: v })}
          />
        </div>
      </div>
    </div>
  );
}
