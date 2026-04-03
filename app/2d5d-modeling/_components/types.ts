/**
 * 各パーツの位置（カメラローカル空間）
 * x: カメラから見て左右（右が正）
 * y: カメラから見て上下（上が正）
 * z: カメラから見て奥行き（手前が正）
 */
export interface SpritePosition {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number; // 度
}

/** あるカメラ角度における全パーツの配置 */
export interface Keyframe {
  angle: number; // カメラ水平角度（0°=正面）
  leftEye: SpritePosition;
  rightEye: SpritePosition;
  leftBrow: SpritePosition;
  rightBrow: SpritePosition;
}

/** 正面(0°)でのカメラローカル空間でのデフォルト位置 */
const DEFAULT_LEFT_EYE: SpritePosition = {
  x: -0.018,
  y: 0.075,
  z: 0.005,
  scale: 0.015,
  rotation: 0,
};

const DEFAULT_RIGHT_EYE: SpritePosition = {
  x: 0.018,
  y: 0.075,
  z: 0.005,
  scale: 0.015,
  rotation: 0,
};

const DEFAULT_LEFT_BROW: SpritePosition = {
  x: -0.018,
  y: 0.09,
  z: 0.005,
  scale: 0.02,
  rotation: 0,
};

const DEFAULT_RIGHT_BROW: SpritePosition = {
  x: 0.018,
  y: 0.09,
  z: 0.005,
  scale: 0.02,
  rotation: 0,
};

export function createDefaultKeyframe(angle: number): Keyframe {
  return {
    angle,
    leftEye: { ...DEFAULT_LEFT_EYE },
    rightEye: { ...DEFAULT_RIGHT_EYE },
    leftBrow: { ...DEFAULT_LEFT_BROW },
    rightBrow: { ...DEFAULT_RIGHT_BROW },
  };
}

/**
 * 現在の補間済み配置からキーフレームを作成（現在位置を初期値にする）
 */
export function createKeyframeFromCurrent(
  angle: number,
  current: Keyframe,
): Keyframe {
  return {
    angle,
    leftEye: { ...current.leftEye },
    rightEye: { ...current.rightEye },
    leftBrow: { ...current.leftBrow },
    rightBrow: { ...current.rightBrow },
  };
}

/** 初期状態: 正面のみ */
export const DEFAULT_KEYFRAMES: Keyframe[] = [createDefaultKeyframe(0)];

/** 2つのSpritePosition間を線形補間 */
export function lerpSpritePosition(
  a: SpritePosition,
  b: SpritePosition,
  t: number,
): SpritePosition {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    scale: a.scale + (b.scale - a.scale) * t,
    rotation: a.rotation + (b.rotation - a.rotation) * t,
  };
}

/** カメラ角度に対して、キーフレーム配列から補間した配置を返す */
export function interpolateKeyframes(
  keyframes: Keyframe[],
  angle: number,
): Keyframe {
  if (keyframes.length === 0) return createDefaultKeyframe(angle);
  if (keyframes.length === 1) return { ...keyframes[0], angle };

  const sorted = [...keyframes].sort((a, b) => a.angle - b.angle);

  if (angle <= sorted[0].angle) return { ...sorted[0], angle };
  if (angle >= sorted[sorted.length - 1].angle)
    return { ...sorted[sorted.length - 1], angle };

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (angle >= a.angle && angle <= b.angle) {
      const t = (angle - a.angle) / (b.angle - a.angle);
      return {
        angle,
        leftEye: lerpSpritePosition(a.leftEye, b.leftEye, t),
        rightEye: lerpSpritePosition(a.rightEye, b.rightEye, t),
        leftBrow: lerpSpritePosition(a.leftBrow, b.leftBrow, t),
        rightBrow: lerpSpritePosition(a.rightBrow, b.rightBrow, t),
      };
    }
  }

  return { ...sorted[0], angle };
}
