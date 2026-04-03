"use client";

import { useCallback, useEffect, useState } from "react";
import { ParameterPanel } from "./ParameterPanel";
import type { AutoOffsetParams, BrowParams, EyeParams } from "./types";
import {
  DEFAULT_AUTO_OFFSET,
  DEFAULT_BROW_PARAMS,
  DEFAULT_EYE_PARAMS,
} from "./types";
import { Viewport } from "./Viewport";

const STORAGE_KEY = "2d5d-eye-placement-params";

interface SavedParams {
  eyeParams: EyeParams;
  browParams: BrowParams;
  autoOffset: AutoOffsetParams;
}

function loadParams(): SavedParams | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedParams;
  } catch {
    return null;
  }
}

function saveParams(params: SavedParams) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // ignore
  }
}

interface EyePlacementToolProps {
  modelUrl: string;
}

export function EyePlacementTool({ modelUrl }: EyePlacementToolProps) {
  const [eyeParams, setEyeParams] = useState<EyeParams>(DEFAULT_EYE_PARAMS);
  const [browParams, setBrowParams] = useState<BrowParams>(DEFAULT_BROW_PARAMS);
  const [autoOffset, setAutoOffset] =
    useState<AutoOffsetParams>(DEFAULT_AUTO_OFFSET);
  const [cameraAngle, setCameraAngle] = useState({ h: 0, v: 0 });
  const [fixedAngle, setFixedAngle] = useState<{
    h: number;
    v: number;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 初回読み込み
  useEffect(() => {
    const saved = loadParams();
    if (saved) {
      setEyeParams(saved.eyeParams);
      setBrowParams(saved.browParams);
      setAutoOffset(saved.autoOffset);
    }
    setLoaded(true);
  }, []);

  // 変更時に自動保存
  useEffect(() => {
    if (!loaded) return;
    saveParams({ eyeParams, browParams, autoOffset });
  }, [eyeParams, browParams, autoOffset, loaded]);

  const handleAngleChange = useCallback((angle: { h: number; v: number }) => {
    setCameraAngle(angle);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      <Viewport
        modelUrl={modelUrl}
        eyeParams={eyeParams}
        browParams={browParams}
        autoOffset={autoOffset}
        fixedAngle={fixedAngle}
        onAngleChange={handleAngleChange}
      />
      <ParameterPanel
        eyeParams={eyeParams}
        browParams={browParams}
        autoOffset={autoOffset}
        cameraAngle={cameraAngle}
        fixedAngle={fixedAngle}
        onEyeChange={setEyeParams}
        onBrowChange={setBrowParams}
        onAutoOffsetChange={setAutoOffset}
        onFixedAngleChange={setFixedAngle}
      />
    </div>
  );
}
