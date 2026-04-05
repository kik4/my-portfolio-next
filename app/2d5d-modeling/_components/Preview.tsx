"use client";

import polygonClipping from "polygon-clipping";
import { useMemo } from "react";
import { HeadModel3D } from "./HeadModel3D";
import type { Keyframe, Part } from "./types";
import { partToPolygon, partToStrokePath, partToSvgPath } from "./types";

const VIEWBOX_SIZE = 400;

/** シルエット統合されるパーツのユニオンをSVGパス文字列にする */
function buildUnionPath(parts: Part[]): string {
  if (parts.length === 0) return "";

  const polys: [number, number][][][] = parts.map((part) => {
    const ring = partToPolygon(part);
    if (ring.length > 0) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
    }
    return [ring];
  });

  let result: [number, number][][][];
  try {
    result = polygonClipping.union(
      polys[0] as Parameters<typeof polygonClipping.union>[0],
      ...polys
        .slice(1)
        .map((p) => p as Parameters<typeof polygonClipping.union>[0]),
    );
  } catch {
    return "";
  }

  const pathParts: string[] = [];
  for (const polygon of result) {
    for (const ring of polygon) {
      if (ring.length === 0) continue;
      const [x0, y0] = ring[0];
      let d = `M ${x0} ${y0}`;
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = ring[i];
        d += ` L ${x} ${y}`;
      }
      d += " Z";
      pathParts.push(d);
    }
  }
  return pathParts.join(" ");
}

/** オーバーレイパーツを塗りと線（一部のみ）に分けて描画 */
function OverlayPart({ part }: { part: Part }) {
  const fillPath = partToSvgPath(part);
  const strokePath = partToStrokePath(part);
  return (
    <g>
      {part.fillColor && (
        <path d={fillPath} fill={part.fillColor} stroke="none" />
      )}
      {strokePath && (
        <path
          d={strokePath}
          fill="none"
          stroke={part.strokeColor}
          strokeWidth={part.strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

interface PreviewProps {
  keyframe: Keyframe | null;
  referenceAngle: number;
  referenceOpacity: number; // 0〜1
}

export function Preview({
  keyframe,
  referenceAngle,
  referenceOpacity,
}: PreviewProps) {
  const { silhouettePath, backParts, frontParts, silhouetteStyle } =
    useMemo(() => {
      if (!keyframe) {
        return {
          silhouettePath: "",
          backParts: [] as Part[],
          frontParts: [] as Part[],
          silhouetteStyle: null as Part | null,
        };
      }
      const merged = keyframe.parts.filter((p) => p.mergeToSilhouette);
      const overlay = keyframe.parts.filter((p) => p.drawAsOverlay);
      // シルエットのz=0を基準に、z<0は奥、z>=0は手前
      const back = overlay.filter((p) => p.z < 0).sort((a, b) => a.z - b.z);
      const front = overlay.filter((p) => p.z >= 0).sort((a, b) => a.z - b.z);
      return {
        silhouettePath: buildUnionPath(merged),
        backParts: back,
        frontParts: front,
        silhouetteStyle: merged[0] ?? null,
      };
    }, [keyframe]);

  if (!keyframe) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-100 text-gray-400 text-sm">
        キーフレームがありません
      </div>
    );
  }

  const fillColor = silhouetteStyle?.fillColor ?? "#fde0c8";
  const strokeColor = silhouetteStyle?.strokeColor ?? "#333333";
  const strokeWidth = silhouetteStyle?.strokeWidth ?? 2;

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-100">
      <div
        className="relative"
        style={{ width: "min(100%, 600px)", aspectRatio: "1 / 1" }}
      >
        {/* 2D顔描画（下レイヤー） */}
        <svg
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          className="absolute inset-0 h-full w-full"
          style={{ background: "#d0d0d0" }}
        >
          <title>Preview</title>
          <rect width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill="#d0d0d0" />
          {/* シルエットより奥のパーツ */}
          {backParts.map((part) => (
            <OverlayPart key={part.id} part={part} />
          ))}
          {/* シルエット（ユニオン） */}
          <path
            d={silhouettePath}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* シルエットより手前のパーツ */}
          {frontParts.map((part) => (
            <OverlayPart key={part.id} part={part} />
          ))}
        </svg>
        {/* 3D参考モデル（上レイヤー） */}
        {referenceOpacity > 0 && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ opacity: referenceOpacity }}
          >
            <HeadModel3D angle={referenceAngle} />
          </div>
        )}
      </div>
    </div>
  );
}
