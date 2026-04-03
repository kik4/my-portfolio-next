"use client";

import { useCallback, useEffect, useState } from "react";
import { ParameterPanel } from "./ParameterPanel";
import type { Keyframe } from "./types";
import { DEFAULT_KEYFRAMES } from "./types";
import { Viewport } from "./Viewport";

const STORAGE_KEY = "2d5d-eye-placement-params";

function loadKeyframes(): Keyframe[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Keyframe[];
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
        onAngleChange={handleAngleChange}
      />
      <ParameterPanel
        keyframes={keyframes}
        cameraAngle={cameraAngle}
        fixedAngle={fixedAngle}
        selectedKeyframeIndex={selectedKeyframeIndex}
        onKeyframesChange={setKeyframes}
        onFixedAngleChange={setFixedAngle}
        onSelectKeyframe={setSelectedKeyframeIndex}
      />
    </div>
  );
}
