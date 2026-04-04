/** 断面の1頂点（2D座標、断面エディタ上での位置） */
export interface Point2D {
  x: number; // 水平（断面の幅方向）
  y: number; // 垂直（上下）
}

/** ある角度の断面データ */
export interface CrossSection {
  angle: number; // 水平角度（0°=正面断面、90°=側面断面）
  points: Point2D[]; // 頂点配列（閉じた曲線、頭頂部から時計回り）
  symmetric: boolean; // 左右対称
}

/** 頂点数のデフォルト */
export const DEFAULT_POINT_COUNT = 32;

/** 円形のデフォルト断面を生成 */
export function createDefaultCrossSection(
  angle: number,
  pointCount: number = DEFAULT_POINT_COUNT,
  radius: number = 0.5,
): CrossSection {
  const points: Point2D[] = [];
  for (let i = 0; i < pointCount; i++) {
    // 頭頂部（上端）から時計回り
    const t = (i / pointCount) * Math.PI * 2 - Math.PI / 2;
    points.push({
      x: Math.cos(t) * radius,
      y: -Math.sin(t) * radius,
    });
  }
  return { angle, points, symmetric: true };
}

/** 2つの断面間を線形補間 */
export function lerpCrossSection(
  a: CrossSection,
  b: CrossSection,
  t: number,
): CrossSection {
  const angle = a.angle + (b.angle - a.angle) * t;
  const points = a.points.map((pa, i) => {
    const pb = b.points[i];
    return {
      x: pa.x + (pb.x - pa.x) * t,
      y: pa.y + (pb.y - pa.y) * t,
    };
  });
  return { angle, points, symmetric: false };
}

/** 角度に対して補間した断面を返す */
export function interpolateCrossSections(
  sections: CrossSection[],
  angle: number,
): CrossSection | null {
  if (sections.length === 0) return null;
  if (sections.length === 1) return sections[0];

  const sorted = [...sections].sort((a, b) => a.angle - b.angle);

  if (angle <= sorted[0].angle) return sorted[0];
  if (angle >= sorted[sorted.length - 1].angle)
    return sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (angle >= a.angle && angle <= b.angle) {
      const t = (angle - a.angle) / (b.angle - a.angle);
      return lerpCrossSection(a, b, t);
    }
  }

  return sorted[0];
}

/**
 * 断面を左右対称にする
 * 左半分（インデックス0〜N/2）を右半分にミラーコピー
 * 頂点は頭頂部(0)から時計回りなので:
 *   0 = 頭頂部, N/4 = 右端, N/2 = 底部, 3N/4 = 左端
 *   右半分(1〜N/2-1)を左半分(N-1〜N/2+1)にミラー
 */
export function mirrorCrossSection(section: CrossSection): CrossSection {
  const n = section.points.length;
  const half = Math.floor(n / 2);
  const points = [...section.points];
  for (let i = 1; i < half; i++) {
    const src = points[i];
    points[n - i] = { x: -src.x, y: src.y };
  }
  return { ...section, points };
}

/** 断面の2D頂点を3D空間の座標に変換（Y軸中心に角度分回転） */
export function crossSectionTo3D(
  section: CrossSection,
): { x: number; y: number; z: number }[] {
  const n = section.points.length;
  const half = Math.floor(n / 2);
  const rad = (section.angle * Math.PI) / 180;
  return section.points.map((p, i) => {
    // 上端(0)と下端(N/2)付近の頂点はx=0に収束させて交差を防ぐ
    const distFromTop = Math.min(i, n - i);
    const distFromBottom = Math.abs(i - half);
    const distFromPole = Math.min(distFromTop, distFromBottom);
    // 極から2頂点以内は徐々にx=0に寄せる
    const poleBlend = Math.min(distFromPole / 2, 1);
    const px = p.x * poleBlend;
    return {
      x: -px * Math.cos(rad),
      y: p.y,
      z: -px * Math.sin(rad),
    };
  });
}
