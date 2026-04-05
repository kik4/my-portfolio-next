/** 2D座標 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * ベジェ曲線の1つの制御点（アンカー）
 * アンカー位置とハンドル（前後）を持つ
 * ハンドルはアンカーからの相対座標
 */
export interface BezierAnchor {
  position: Point2D;
  handleIn: Point2D; // 前のセグメントからの入りのハンドル（相対）
  handleOut: Point2D; // 次のセグメントへの出のハンドル（相対）
  /** このアンカーから次のアンカーへのセグメントに線を描くか（未指定ならtrue扱い） */
  strokeNext?: boolean;
}

/** パーツ（複数の制御点で構成されるベジェ曲線） */
export interface Part {
  id: string;
  name: string;
  anchors: BezierAnchor[];
  closed: boolean; // 閉じた曲線か
  strokeColor: string;
  strokeWidth: number;
  fillColor: string | null;
  /** 顔のシルエット（ユニオン）に含めるか */
  mergeToSilhouette: boolean;
  /** 独立パーツとして描画するか（mergeToSilhouetteと両立可能） */
  drawAsOverlay: boolean;
  /** 描画順序（小さいほど奥、大きいほど手前）。シルエットは0として扱う */
  z: number;
}

/** ある角度でのパーツ群のスナップショット（キーフレーム） */
export interface Keyframe {
  angle: number; // カメラ水平角度
  parts: Part[];
}

/** プロジェクト全体のデータ */
export interface ProjectData {
  keyframes: Keyframe[];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function lerpAnchor(a: BezierAnchor, b: BezierAnchor, t: number): BezierAnchor {
  return {
    position: lerpPoint(a.position, b.position, t),
    handleIn: lerpPoint(a.handleIn, b.handleIn, t),
    handleOut: lerpPoint(a.handleOut, b.handleOut, t),
    strokeNext: a.strokeNext,
  };
}

function lerpPart(a: Part, b: Part, t: number): Part {
  return {
    ...a,
    anchors: a.anchors.map((aa, i) => lerpAnchor(aa, b.anchors[i], t)),
    z: lerp(a.z, b.z, t),
  };
}

/** 2つのキーフレーム間の線形補間 */
export function lerpKeyframe(a: Keyframe, b: Keyframe, t: number): Keyframe {
  // 両方のキーフレームでパーツのidが一致すると仮定
  const parts = a.parts.map((pa) => {
    const pb = b.parts.find((p) => p.id === pa.id);
    if (!pb || pb.anchors.length !== pa.anchors.length) return pa;
    return lerpPart(pa, pb, t);
  });
  return { angle: lerp(a.angle, b.angle, t), parts };
}

/** 角度から補間されたキーフレームを返す */
export function interpolateKeyframes(
  keyframes: Keyframe[],
  angle: number,
): Keyframe | null {
  if (keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0];

  const sorted = [...keyframes].sort((a, b) => a.angle - b.angle);
  if (angle <= sorted[0].angle) return sorted[0];
  if (angle >= sorted[sorted.length - 1].angle)
    return sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (angle === a.angle) return a;
    if (angle === b.angle) return b;
    if (angle > a.angle && angle < b.angle) {
      const t = (angle - a.angle) / (b.angle - a.angle);
      return lerpKeyframe(a, b, t);
    }
  }
  return sorted[0];
}

/** パーツをSVGのd属性文字列に変換 */
export function partToSvgPath(part: Part): string {
  if (part.anchors.length === 0) return "";
  const { anchors, closed } = part;
  const first = anchors[0];
  let d = `M ${first.position.x} ${first.position.y}`;
  for (let i = 1; i < anchors.length; i++) {
    const prev = anchors[i - 1];
    const cur = anchors[i];
    const c1x = prev.position.x + prev.handleOut.x;
    const c1y = prev.position.y + prev.handleOut.y;
    const c2x = cur.position.x + cur.handleIn.x;
    const c2y = cur.position.y + cur.handleIn.y;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${cur.position.x} ${cur.position.y}`;
  }
  if (closed) {
    const last = anchors[anchors.length - 1];
    const c1x = last.position.x + last.handleOut.x;
    const c1y = last.position.y + last.handleOut.y;
    const c2x = first.position.x + first.handleIn.x;
    const c2y = first.position.y + first.handleIn.y;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${first.position.x} ${first.position.y}`;
    d += " Z";
  }
  return d;
}

/**
 * 線として描くセグメントのみのSVGパス文字列を生成する
 * 各アンカーの strokeNext が false のセグメントはスキップ
 * 連続する線セグメントはまとめて1つのサブパスにする
 */
export function partToStrokePath(part: Part): string {
  const { anchors, closed } = part;
  const n = anchors.length;
  if (n === 0) return "";

  const segmentCount = closed ? n : n - 1;
  const subPaths: string[] = [];
  let currentSub = "";
  let prevWasStroke = false;

  for (let i = 0; i < segmentCount; i++) {
    const a = anchors[i];
    const b = anchors[(i + 1) % n];
    const stroke = a.strokeNext !== false;
    if (!stroke) {
      if (currentSub) {
        subPaths.push(currentSub);
        currentSub = "";
      }
      prevWasStroke = false;
      continue;
    }
    const c1x = a.position.x + a.handleOut.x;
    const c1y = a.position.y + a.handleOut.y;
    const c2x = b.position.x + b.handleIn.x;
    const c2y = b.position.y + b.handleIn.y;
    if (!prevWasStroke) {
      currentSub = `M ${a.position.x} ${a.position.y}`;
    }
    currentSub += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${b.position.x} ${b.position.y}`;
    prevWasStroke = true;
  }
  if (currentSub) subPaths.push(currentSub);
  return subPaths.join(" ");
}

/** 楕円形の閉じたベジェパスを作成する（n個のアンカー） */
export function createEllipseAnchors(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count: number,
): BezierAnchor[] {
  // 楕円のベジェ近似: 1/4円あたり 4*(sqrt(2)-1)/3 ≈ 0.5522 の係数
  const k = (4 * (Math.sqrt(2) - 1)) / 3;
  const anchors: BezierAnchor[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(t) * rx;
    const y = cy + Math.sin(t) * ry;
    // 接線方向
    const tx = -Math.sin(t);
    const ty = Math.cos(t);
    const segmentAngle = (Math.PI * 2) / count;
    const handleLen =
      ((k * 4) / count) * Math.min(rx, ry) * (segmentAngle / (Math.PI / 2));
    anchors.push({
      position: { x, y },
      handleIn: { x: -tx * handleLen, y: -ty * handleLen },
      handleOut: { x: tx * handleLen, y: ty * handleLen },
    });
  }
  return anchors;
}

/** デフォルトの顔輪郭パーツを作成 */
export function createDefaultFaceOutline(): Part {
  return {
    id: "face-outline",
    name: "顔の輪郭",
    anchors: createEllipseAnchors(200, 200, 90, 120, 8),
    closed: true,
    strokeColor: "#333333",
    strokeWidth: 2,
    fillColor: "#fde0c8",
    mergeToSilhouette: true,
    drawAsOverlay: false,
    z: 0,
  };
}

/**
 * デフォルトの鼻パーツ（鼻の輪郭＋鼻筋を兼ねる）
 * - シルエット統合: 横顔で顔の輪郭を拡張する
 * - オーバーレイ: 肌色の塗りで奥の目を部分的に隠しつつ、一部のセグメントに鼻筋の線を描く
 * - 正面では全アンカーの strokeNext=false にして線を描かない想定
 */
export function createDefaultNose(): Part {
  const anchors = createEllipseAnchors(200, 220, 15, 30, 6);
  return {
    id: "nose",
    name: "鼻",
    // 正面デフォルトは線なし
    anchors: anchors.map((a) => ({ ...a, strokeNext: false })),
    closed: true,
    strokeColor: "#555555",
    strokeWidth: 1.5,
    fillColor: "#fde0c8",
    mergeToSilhouette: true,
    drawAsOverlay: true,
    z: 0.5,
  };
}

/** デフォルトの左目パーツ */
export function createDefaultLeftEye(): Part {
  return {
    id: "left-eye",
    name: "左目",
    anchors: createEllipseAnchors(165, 195, 12, 14, 6),
    closed: true,
    strokeColor: "#222222",
    strokeWidth: 1.5,
    fillColor: "#222222",
    mergeToSilhouette: false,
    drawAsOverlay: true,
    z: 1,
  };
}

/** デフォルトの右目パーツ */
export function createDefaultRightEye(): Part {
  return {
    id: "right-eye",
    name: "右目",
    anchors: createEllipseAnchors(235, 195, 12, 14, 6),
    closed: true,
    strokeColor: "#222222",
    strokeWidth: 1.5,
    fillColor: "#222222",
    mergeToSilhouette: false,
    drawAsOverlay: true,
    z: 1,
  };
}

/** デフォルトのキーフレームを作成 */
export function createDefaultKeyframe(angle: number): Keyframe {
  return {
    angle,
    parts: [
      createDefaultFaceOutline(),
      createDefaultNose(),
      createDefaultLeftEye(),
      createDefaultRightEye(),
    ],
  };
}

/** パーツの制御点数を正規化（他のキーフレームに合わせる） */
export function alignPartAnchorCount(part: Part, targetCount: number): Part {
  if (part.anchors.length === targetCount) return part;
  return part;
}

/** 3次ベジェの1点を計算 */
function cubicBezierPoint(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  t: number,
): Point2D {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  return {
    x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
    y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
  };
}

/** パーツを多角形（[x, y]の配列）に近似 */
export function partToPolygon(
  part: Part,
  segmentsPerCurve = 16,
): [number, number][] {
  const result: [number, number][] = [];
  const n = part.anchors.length;
  if (n === 0) return result;

  const limit = part.closed ? n : n - 1;
  for (let i = 0; i < limit; i++) {
    const a = part.anchors[i];
    const b = part.anchors[(i + 1) % n];
    const p0 = a.position;
    const p1 = {
      x: a.position.x + a.handleOut.x,
      y: a.position.y + a.handleOut.y,
    };
    const p2 = {
      x: b.position.x + b.handleIn.x,
      y: b.position.y + b.handleIn.y,
    };
    const p3 = b.position;
    for (let s = 0; s < segmentsPerCurve; s++) {
      const t = s / segmentsPerCurve;
      const p = cubicBezierPoint(p0, p1, p2, p3, t);
      result.push([p.x, p.y]);
    }
  }
  if (!part.closed) {
    const last = part.anchors[n - 1].position;
    result.push([last.x, last.y]);
  }
  return result;
}

/** 多角形リングがCCW(反時計回り)ならCW(時計回り)に反転 */
function ensureCW(ring: [number, number][]): [number, number][] {
  // SVGのY軸は下向き。polygon-clippingはCW/CCWを自動判定するため気にしない
  return ring;
}

/** リングを閉じる（最初の点を末尾に追加） */
function closeRing(ring: [number, number][]): [number, number][] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

export type PolygonRing = [number, number][];

/** パーツを polygon-clipping 形式のポリゴンに変換 */
export function partToPolygonClippingInput(part: Part): PolygonRing[] {
  const poly = closeRing(ensureCW(partToPolygon(part)));
  return [poly];
}
