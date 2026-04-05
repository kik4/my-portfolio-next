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

/** 重み付きで複数キーフレームをブレンド（weightsは正規化済み前提） */
function blendKeyframesWithWeights(
  items: Keyframe[],
  weights: number[],
): Keyframe {
  // strokeNextは最大重みのキーフレームから継承
  let maxIdx = 0;
  for (let i = 1; i < weights.length; i++) {
    if (weights[i] > weights[maxIdx]) maxIdx = i;
  }
  const base = items[maxIdx];

  const newParts: Part[] = base.parts.map((basePart) => {
    // 全キーフレームから対応するパーツを集める（idで一致）
    const matched = items.map((kf) => {
      const p = kf.parts.find((pp) => pp.id === basePart.id);
      if (!p || p.anchors.length !== basePart.anchors.length) return null;
      return p;
    });

    // strokeNextsは最大重みのキーフレームから
    const strokeParts = matched[maxIdx];
    const strokeNexts = strokeParts
      ? strokeParts.anchors.map((a) => a.strokeNext)
      : basePart.anchors.map((a) => a.strokeNext);

    const newAnchors = basePart.anchors.map((_, ai) => {
      let x = 0;
      let y = 0;
      let hinX = 0;
      let hinY = 0;
      let houtX = 0;
      let houtY = 0;
      for (let ki = 0; ki < items.length; ki++) {
        const p = matched[ki];
        if (!p) continue;
        const w = weights[ki];
        const a = p.anchors[ai];
        x += a.position.x * w;
        y += a.position.y * w;
        hinX += a.handleIn.x * w;
        hinY += a.handleIn.y * w;
        houtX += a.handleOut.x * w;
        houtY += a.handleOut.y * w;
      }
      return {
        position: { x, y },
        handleIn: { x: hinX, y: hinY },
        handleOut: { x: houtX, y: houtY },
        strokeNext: strokeNexts[ai],
      };
    });

    let zBlend = 0;
    for (let ki = 0; ki < items.length; ki++) {
      const p = matched[ki];
      if (!p) continue;
      zBlend += p.z * weights[ki];
    }

    return { ...basePart, anchors: newAnchors, z: zBlend };
  });

  let angleBlend = 0;
  let angleVBlend = 0;
  for (let i = 0; i < items.length; i++) {
    angleBlend += items[i].angle * weights[i];
    angleVBlend += items[i].angleV * weights[i];
  }

  return { angle: angleBlend, angleV: angleVBlend, parts: newParts };
}

/**
 * 連立方程式 A x = b を解く（ガウス消去法）
 * A は n×n、b は長さ n（結果を上書き）
 */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  // ピボット選択付きガウス消去法
  const M: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    let maxVal = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxVal) {
        maxVal = Math.abs(M[k][i]);
        maxRow = k;
      }
    }
    if (maxVal < 1e-12) return null;
    if (maxRow !== i) {
      [M[i], M[maxRow]] = [M[maxRow], M[i]];
    }
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

/**
 * RBF補間用のキャッシュ。キーフレーム配列が変わるたびに再計算される。
 * weights[i][j] は i 番目のキーフレーム点での基底の j 番目の係数。
 */
interface RBFCache {
  points: Keyframe[];
  weights: number[][]; // N × N
  epsilon: number;
}

let rbfCache: RBFCache | null = null;

function gaussian(r: number, epsilon: number): number {
  const er = epsilon * r;
  return Math.exp(-(er * er));
}

function buildRBFCache(points: Keyframe[]): RBFCache | null {
  const n = points.length;
  if (n === 0) return null;

  // epsilonを平均点間距離の逆数で自動設定
  let sumDist = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dh = points[i].angle - points[j].angle;
      const dv = points[i].angleV - points[j].angleV;
      sumDist += Math.sqrt(dh * dh + dv * dv);
      count++;
    }
  }
  const avgDist = count > 0 ? sumDist / count : 1;
  const epsilon = 1 / avgDist;

  // 行列 Φ_ij = φ(|x_i - x_j|) を構築
  const phi: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const dh = points[i].angle - points[j].angle;
      const dv = points[i].angleV - points[j].angleV;
      const r = Math.sqrt(dh * dh + dv * dv);
      row.push(gaussian(r, epsilon));
    }
    phi.push(row);
  }

  // 各 i について Φ w_i = e_i を解く
  const weights: number[][] = [];
  for (let i = 0; i < n; i++) {
    const e = new Array(n).fill(0);
    e[i] = 1;
    const w = solveLinearSystem(
      phi.map((row) => [...row]),
      e,
    );
    if (!w) return null;
    weights.push(w);
  }

  return { points, weights, epsilon };
}

function getRBFCache(points: Keyframe[]): RBFCache | null {
  if (rbfCache && rbfCache.points === points) return rbfCache;
  rbfCache = buildRBFCache(points);
  return rbfCache;
}

/**
 * flat補間（極除外）: RBF補間
 * 各キーフレームに関して、その点で1・他の点で0となる連続的な重みを計算し、
 * 全キーフレームの重み付き平均で補間する。
 */
export function interpolateFlat(
  keyframes: Keyframe[],
  angle: number,
  angleV: number,
): Keyframe | null {
  const flat = keyframes;
  if (flat.length === 0) return null;
  if (flat.length === 1) return flat[0];

  const cache = getRBFCache(flat);
  if (!cache) return flat[0];

  const { points, weights, epsilon } = cache;
  const n = points.length;

  // 補間点 x での各キーフレームの重み u_i(x)
  // u_i(x) = Σ_j weights[i][j] * φ(|x - x_j|)
  const phiX = new Array(n);
  for (let j = 0; j < n; j++) {
    const dh = angle - points[j].angle;
    const dv = angleV - points[j].angleV;
    const r = Math.sqrt(dh * dh + dv * dv);
    phiX[j] = gaussian(r, epsilon);
  }

  const u = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      u[i] += weights[i][j] * phiX[j];
    }
  }

  // 重みの和で正規化（RBFは和が1にならないため）
  let sum = 0;
  for (let i = 0; i < n; i++) sum += u[i];
  if (Math.abs(sum) < 1e-9) return points[0];
  for (let i = 0; i < n; i++) u[i] /= sum;

  return blendKeyframesWithWeights(points, u);
}

/**
 * 2D角度(h, v)から補間されたキーフレームを返す。
 * 極(|v|=90)も通常のキーフレームとして扱い、RBF補間で統一的にブレンドする。
 */
export function interpolateKeyframes(
  keyframes: Keyframe[],
  angle: number,
  angleV = 0,
): Keyframe | null {
  if (keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0];

  const exact = keyframes.find((k) => k.angle === angle && k.angleV === angleV);
  if (exact) return exact;

  return interpolateFlat(keyframes, angle, angleV);
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
