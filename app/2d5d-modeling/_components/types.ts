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
  angle: number; // カメラ水平角度 (0=正面, 90=真横)
  angleV: number; // カメラ垂直角度 (0=水平, +=下から見上げる, -=上から見下ろす)
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
  return {
    angle: lerp(a.angle, b.angle, t),
    angleV: lerp(a.angleV, b.angleV, t),
    parts,
  };
}

/**
 * 1次元線形補間: キーフレーム群をangleV軸で補間
 * 入力: 同じangle値のキーフレームのみ、または近い値として扱う
 */
function interpolate1D(items: Keyframe[], targetV: number): Keyframe | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  const sorted = [...items].sort((a, b) => a.angleV - b.angleV);
  if (targetV <= sorted[0].angleV) return sorted[0];
  if (targetV >= sorted[sorted.length - 1].angleV)
    return sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (targetV === a.angleV) return a;
    if (targetV === b.angleV) return b;
    if (targetV > a.angleV && targetV < b.angleV) {
      const t = (targetV - a.angleV) / (b.angleV - a.angleV);
      return lerpKeyframe(a, b, t);
    }
  }
  return sorted[0];
}

/**
 * v=0 平面内での補間: h軸で隣接する列を見つけ、各列内でv補間してからh補間する
 * 極キーフレーム (|v|=90, h=0) は除外する
 */
function interpolateFlat(
  keyframes: Keyframe[],
  angle: number,
  angleV: number,
): Keyframe | null {
  // 極キーフレームを除外
  const flat = keyframes.filter((k) => Math.abs(k.angleV) !== 90);
  if (flat.length === 0) return null;
  if (flat.length === 1) return flat[0];

  const uniqueHs = Array.from(new Set(flat.map((k) => k.angle))).sort(
    (a, b) => a - b,
  );

  let hLow: number;
  let hHigh: number;
  if (angle <= uniqueHs[0]) {
    hLow = uniqueHs[0];
    hHigh = uniqueHs[0];
  } else if (angle >= uniqueHs[uniqueHs.length - 1]) {
    hLow = uniqueHs[uniqueHs.length - 1];
    hHigh = uniqueHs[uniqueHs.length - 1];
  } else {
    hLow = uniqueHs[0];
    hHigh = uniqueHs[uniqueHs.length - 1];
    for (let i = 0; i < uniqueHs.length - 1; i++) {
      if (angle >= uniqueHs[i] && angle <= uniqueHs[i + 1]) {
        hLow = uniqueHs[i];
        hHigh = uniqueHs[i + 1];
        break;
      }
    }
  }

  const lowCol = flat.filter((k) => k.angle === hLow);
  const highCol = flat.filter((k) => k.angle === hHigh);
  const lowKf = interpolate1D(lowCol, angleV);
  const highKf = interpolate1D(highCol, angleV);
  if (!lowKf) return highKf;
  if (!highKf) return lowKf;
  if (hLow === hHigh) return lowKf;

  const t = (angle - hLow) / (hHigh - hLow);
  return lerpKeyframe(lowKf, highKf, t);
}

/** 画面中心を基準にパーツ全体を回転させる */
function rotatePart(
  part: Part,
  rotationDeg: number,
  cx: number,
  cy: number,
): Part {
  if (rotationDeg === 0) return part;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotPoint = (p: Point2D): Point2D => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  };
  const rotVec = (p: Point2D): Point2D => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  });
  return {
    ...part,
    anchors: part.anchors.map((a) => ({
      ...a,
      position: rotPoint(a.position),
      handleIn: rotVec(a.handleIn),
      handleOut: rotVec(a.handleOut),
    })),
  };
}

function rotateKeyframe(
  kf: Keyframe,
  rotationDeg: number,
  cx: number,
  cy: number,
): Keyframe {
  if (rotationDeg === 0) return kf;
  return {
    ...kf,
    parts: kf.parts.map((p) => rotatePart(p, rotationDeg, cx, cy)),
  };
}

/** 回転中心（画面中心） */
const ROTATION_CENTER_X = 200;
const ROTATION_CENTER_Y = 200;

/**
 * 2D角度(h, v)から補間されたキーフレームを返す。
 * v=0 平面の補間と、極 (|v|=90, h=0) のキーフレームをブレンドする。
 * 極キーフレームはangleだけ回転させてから補間する。
 */
export function interpolateKeyframes(
  keyframes: Keyframe[],
  angle: number,
  angleV = 0,
): Keyframe | null {
  if (keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0];

  // 完全一致（極 |v|=90 は h=0 のみ）
  const exact = keyframes.find((k) => k.angle === angle && k.angleV === angleV);
  if (exact) {
    // 極キーフレームはangleだけ回転（v=-90では回転方向を反転）
    if (Math.abs(exact.angleV) === 90) {
      const rotSign = exact.angleV > 0 ? 1 : -1;
      return rotateKeyframe(
        exact,
        angle * rotSign,
        ROTATION_CENTER_X,
        ROTATION_CENTER_Y,
      );
    }
    return exact;
  }

  // v=0平面側の補間結果
  const flatKf = interpolateFlat(keyframes, angle, angleV);

  // 極キーフレーム (h=0, v=90 または v=-90) を取得
  const poleSign = angleV >= 0 ? 1 : -1;
  const poleBase = keyframes.find(
    (k) => k.angle === 0 && k.angleV === 90 * poleSign,
  );

  if (!poleBase) {
    return flatKf;
  }
  // v比率に応じて回転量を決定（v=±90で完全にangle回転、v=0で回転なし）
  // v=-90側では回転方向を反転
  const t = Math.min(Math.abs(angleV) / 90, 1);
  const poleRotated = rotateKeyframe(
    poleBase,
    angle * t * poleSign,
    ROTATION_CENTER_X,
    ROTATION_CENTER_Y,
  );

  if (!flatKf) return poleRotated;

  // flatと極形状を比率でブレンド
  return lerpKeyframe(flatKf, poleRotated, t);
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
export function createDefaultKeyframe(angle: number, angleV = 0): Keyframe {
  return {
    angle,
    angleV,
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
