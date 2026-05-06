"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { ViewKind } from "./Scene";

interface Props {
  renderPane: (view: ViewKind) => ReactNode;
}

const VIEWS: { kind: ViewKind; label: string }[] = [
  { kind: "front", label: "正面 (Front, xy)" },
  { kind: "side", label: "側面 (Side, zy)" },
  { kind: "top", label: "上面 (Top, xz)" },
  { kind: "perspective", label: "3D 操作" },
];

export const QuadView = ({ renderPane }: Props) => {
  const [maximized, setMaximized] = useState<ViewKind | null>(null);

  if (maximized) {
    const v = VIEWS.find((x) => x.kind === maximized);
    if (!v) return null;
    return (
      <div className="relative h-full w-full">
        <div className="absolute inset-0">{renderPane(maximized)}</div>
        <div className="absolute top-1 left-2 rounded bg-white/80 px-2 py-0.5 text-xs">
          {v.label}
        </div>
        <button
          type="button"
          onClick={() => setMaximized(null)}
          className="absolute top-1 right-1 rounded bg-white/80 px-2 py-0.5 text-xs hover:bg-white"
        >
          縮小
        </button>
      </div>
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-gray-300">
      {VIEWS.map((v) => (
        <div key={v.kind} className="relative bg-white">
          <div className="absolute inset-0">{renderPane(v.kind)}</div>
          <div className="absolute top-1 left-2 rounded bg-white/80 px-2 py-0.5 text-xs">
            {v.label}
          </div>
          <button
            type="button"
            onClick={() => setMaximized(v.kind)}
            className="absolute top-1 right-1 rounded bg-white/80 px-2 py-0.5 text-xs hover:bg-white"
          >
            最大化
          </button>
        </div>
      ))}
    </div>
  );
};
