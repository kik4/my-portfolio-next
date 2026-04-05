"use client";

import { useCallback, useEffect, useState } from "react";
import { BezierEditor } from "./BezierEditor";
import { Preview } from "./Preview";
import type { Keyframe, Part } from "./types";
import {
  createDefaultFaceOutline,
  createDefaultKeyframe,
  createDefaultLeftEye,
  createDefaultNose,
  createDefaultRightEye,
  interpolateKeyframes,
} from "./types";

const STORAGE_KEY = "2d5d-bezier-keyframes";

function loadKeyframes(): Keyframe[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Keyframe[];
    // 既存データに目パーツがなければ追加、未定義フィールドを補完
    const eyeIds = new Set(["left-eye", "right-eye"]);
    return parsed.map((kf) => {
      const parts = kf.parts.map((p) => {
        const mergeToSilhouette = p.mergeToSilhouette ?? !eyeIds.has(p.id);
        // drawAsOverlay: 目は常にオーバーレイ、鼻もオーバーレイとして描画、顔の輪郭はしない
        const drawAsOverlay =
          p.drawAsOverlay ?? (p.id === "nose" ? true : !mergeToSilhouette);
        const z = p.z ?? (mergeToSilhouette && !drawAsOverlay ? 0 : 1);
        return { ...p, mergeToSilhouette, drawAsOverlay, z };
      });
      const hasLeft = parts.some((p) => p.id === "left-eye");
      const hasRight = parts.some((p) => p.id === "right-eye");
      // 既存の nose-bridge を nose に統合するため削除
      const filteredParts = parts.filter((p) => p.id !== "nose-bridge");
      if (!hasLeft) filteredParts.push(createDefaultLeftEye());
      if (!hasRight) filteredParts.push(createDefaultRightEye());
      return { ...kf, parts: filteredParts };
    });
  } catch {
    return null;
  }
}

function saveKeyframes(keyframes: Keyframe[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keyframes));
  } catch {
    // ignore
  }
}

const DEFAULT_KEYFRAMES: Keyframe[] = [
  createDefaultKeyframe(0),
  createDefaultKeyframe(90),
];

export function ModelingTool() {
  const [keyframes, setKeyframes] = useState<Keyframe[]>(DEFAULT_KEYFRAMES);
  const [selectedKfIndex, setSelectedKfIndex] = useState(0);
  const [selectedPartId, setSelectedPartId] = useState<string>("face-outline");
  const [currentAngle, setCurrentAngle] = useState(0);
  const [referenceOpacity, setReferenceOpacity] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadKeyframes();
    if (saved && saved.length >= 1) setKeyframes(saved);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveKeyframes(keyframes);
  }, [keyframes, loaded]);

  const selectedKf = keyframes[selectedKfIndex];
  const selectedPart = selectedKf?.parts.find((p) => p.id === selectedPartId);
  const interpolated = interpolateKeyframes(keyframes, currentAngle);

  const handlePartChange = useCallback(
    (updated: Part) => {
      if (!selectedKf) return;
      const newParts = selectedKf.parts.map((p) =>
        p.id === updated.id ? updated : p,
      );
      const newKf = { ...selectedKf, parts: newParts };
      setKeyframes(
        keyframes.map((kf, i) => (i === selectedKfIndex ? newKf : kf)),
      );
    },
    [keyframes, selectedKfIndex, selectedKf],
  );

  const handleResetPart = useCallback(() => {
    if (!selectedPart) return;
    let defaultPart: Part;
    switch (selectedPart.id) {
      case "face-outline":
        defaultPart = createDefaultFaceOutline();
        break;
      case "nose":
        defaultPart = createDefaultNose();
        break;
      case "left-eye":
        defaultPart = createDefaultLeftEye();
        break;
      case "right-eye":
        defaultPart = createDefaultRightEye();
        break;
      default:
        return;
    }
    handlePartChange(defaultPart);
  }, [selectedPart, handlePartChange]);

  const handleAddKeyframe = useCallback(() => {
    // 現在の角度にキーフレームを追加（既存のパーツ構造を継承）
    const angle = Math.round(currentAngle);
    if (keyframes.some((k) => k.angle === angle)) return;
    // 一番近い既存キーフレームからパーツをコピー
    const base = interpolateKeyframes(keyframes, angle);
    if (!base) return;
    const newKf: Keyframe = { angle, parts: base.parts };
    const next = [...keyframes, newKf].sort((a, b) => a.angle - b.angle);
    setKeyframes(next);
    setSelectedKfIndex(next.findIndex((k) => k.angle === angle));
  }, [keyframes, currentAngle]);

  const handleRemoveKeyframe = useCallback(() => {
    if (keyframes.length <= 1) return;
    const next = keyframes.filter((_, i) => i !== selectedKfIndex);
    setKeyframes(next);
    setSelectedKfIndex(Math.min(selectedKfIndex, next.length - 1));
  }, [keyframes, selectedKfIndex]);

  const handleChangeKeyframeAngle = useCallback(
    (newAngle: number) => {
      if (!selectedKf) return;
      if (
        keyframes.some((k, i) => k.angle === newAngle && i !== selectedKfIndex)
      )
        return;
      const updated = keyframes.map((kf, i) =>
        i === selectedKfIndex ? { ...kf, angle: newAngle } : kf,
      );
      // ソートして選択インデックスを追従
      const sorted = [...updated].sort((a, b) => a.angle - b.angle);
      setKeyframes(sorted);
      setSelectedKfIndex(sorted.findIndex((k) => k.angle === newAngle));
    },
    [keyframes, selectedKf, selectedKfIndex],
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 左: プレビュー + 角度スライダー */}
      <div className="flex flex-1 flex-col">
        <Preview
          keyframe={interpolated}
          referenceAngle={currentAngle}
          referenceOpacity={referenceOpacity}
        />
        <div className="flex flex-col gap-2 border-t bg-white p-3">
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-gray-600 text-xs">3D参考</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={referenceOpacity}
              onChange={(e) => setReferenceOpacity(parseFloat(e.target.value))}
              className="h-1.5 flex-1 accent-blue-500"
            />
            <span className="w-10 text-right text-gray-500 text-xs tabular-nums">
              {Math.round(referenceOpacity * 100)}%
            </span>
          </div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-gray-600 text-xs">カメラ角度</span>
            <span className="font-bold text-gray-800 text-sm tabular-nums">
              {currentAngle.toFixed(0)}°
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={90}
            step={1}
            value={currentAngle}
            onChange={(e) => setCurrentAngle(parseFloat(e.target.value))}
            className="h-1.5 w-full accent-blue-500"
          />
        </div>
      </div>

      {/* 右: キーフレーム選択 + ベジェエディタ */}
      <div className="flex w-110 shrink-0 flex-col gap-3 overflow-y-auto border-l bg-white p-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold text-gray-700 text-xs">
              キーフレーム
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleAddKeyframe}
                className="rounded bg-blue-500 px-2 py-0.5 text-white text-xs hover:bg-blue-600"
              >
                + 現在角度で追加
              </button>
              {keyframes.length > 1 && (
                <button
                  type="button"
                  onClick={handleRemoveKeyframe}
                  className="rounded px-2 py-0.5 text-red-500 text-xs hover:bg-red-50"
                >
                  削除
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {keyframes.map((kf, i) => (
              <button
                key={kf.angle}
                type="button"
                onClick={() => {
                  setSelectedKfIndex(i);
                  setCurrentAngle(kf.angle);
                }}
                className={`rounded px-2 py-0.5 text-xs ${
                  selectedKfIndex === i
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                {kf.angle}°
              </button>
            ))}
          </div>
        </div>

        {selectedKf && (
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label
                htmlFor="kf-angle-input"
                className="font-semibold text-gray-700 text-xs"
              >
                キーフレーム角度
              </label>
              <input
                id="kf-angle-input"
                type="number"
                min={0}
                max={90}
                step={1}
                value={selectedKf.angle}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) handleChangeKeyframeAngle(v);
                }}
                className="w-16 rounded border px-2 py-0.5 text-right text-xs"
              />
            </div>
            <div className="mb-2 font-semibold text-gray-700 text-xs">
              パーツ
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedKf.parts.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => setSelectedPartId(part.id)}
                  className={`rounded px-2 py-0.5 text-xs ${
                    selectedPartId === part.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  {part.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedPart && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold text-gray-700 text-xs">
                {selectedKf.angle}° - {selectedPart.name}
              </div>
              <button
                type="button"
                onClick={handleResetPart}
                className="rounded px-2 py-0.5 text-gray-500 text-xs hover:bg-gray-100"
              >
                形状リセット
              </button>
            </div>
            {selectedPart.drawAsOverlay && (
              <div className="mb-2 flex items-center gap-2">
                <label
                  htmlFor="z-slider"
                  className="w-8 shrink-0 text-gray-600 text-xs"
                >
                  Z
                </label>
                <input
                  id="z-slider"
                  type="range"
                  min={-5}
                  max={5}
                  step={0.01}
                  value={selectedPart.z}
                  onChange={(e) =>
                    handlePartChange({
                      ...selectedPart,
                      z: parseFloat(e.target.value),
                    })
                  }
                  className="h-1.5 flex-1 accent-blue-500"
                />
                <span className="w-12 text-right text-gray-500 text-xs tabular-nums">
                  {selectedPart.z.toFixed(2)}
                </span>
              </div>
            )}
            <BezierEditor part={selectedPart} onChange={handlePartChange} />
          </div>
        )}
      </div>
    </div>
  );
}
