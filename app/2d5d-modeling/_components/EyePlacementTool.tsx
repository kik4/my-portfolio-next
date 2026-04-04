"use client";

import { useCallback, useEffect, useState } from "react";
import { ParameterPanel } from "./ParameterPanel";
import type { Keyframe, SpritePosition } from "./types";
import { DEFAULT_KEYFRAMES } from "./types";
import { Viewport } from "./Viewport";

const STORAGE_KEY = "2d5d-eye-placement-params";

function migrateSpritePosition(pos: Record<string, unknown>): SpritePosition {
  return {
    x: (pos.x as number) ?? 0,
    y: (pos.y as number) ?? 0,
    scale: (pos.scale as number) ?? 0.015,
    rotation: (pos.rotation as number) ?? 0,
    depthOffset: (pos.depthOffset as number) ?? 0,
  };
}

function loadKeyframes(): Keyframe[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    return parsed.map((kf) => ({
      angle: (kf.angle as number) ?? 0,
      leftEye: migrateSpritePosition(kf.leftEye as Record<string, unknown>),
      rightEye: migrateSpritePosition(kf.rightEye as Record<string, unknown>),
    }));
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

interface EyePlacementToolProps {
  modelUrl: string;
}

export function EyePlacementTool({ modelUrl }: EyePlacementToolProps) {
  const [keyframes, setKeyframes] = useState<Keyframe[]>(DEFAULT_KEYFRAMES);
  const [cameraAngle, setCameraAngle] = useState({ h: 0, v: 0 });
  const [fixedAngle, setFixedAngle] = useState<{
    h: number;
    v: number;
  } | null>(null);
  const [selectedKeyframeIndex, setSelectedKeyframeIndex] = useState<
    number | null
  >(0);
  const [fov, setFov] = useState(45);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadKeyframes();
    if (saved && saved.length > 0) {
      setKeyframes(saved);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveKeyframes(keyframes);
  }, [keyframes, loaded]);

  const handleAngleChange = useCallback((angle: { h: number; v: number }) => {
    setCameraAngle(angle);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      <Viewport
        modelUrl={modelUrl}
        keyframes={keyframes}
        fixedAngle={fixedAngle}
        fov={fov}
        onAngleChange={handleAngleChange}
      />
      <ParameterPanel
        keyframes={keyframes}
        cameraAngle={cameraAngle}
        fixedAngle={fixedAngle}
        fov={fov}
        selectedKeyframeIndex={selectedKeyframeIndex}
        onKeyframesChange={setKeyframes}
        onFixedAngleChange={setFixedAngle}
        onFovChange={setFov}
        onSelectKeyframe={setSelectedKeyframeIndex}
      />
    </div>
  );
}
