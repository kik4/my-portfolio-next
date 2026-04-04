/**
 * 各パーツの位置（カメラローカル空間）
 * x: カメラから見て左右（右が正、顔中心からの相対値）
 * y: カメラから見て上下（上が正、顔中心からの相対値）
 */
export interface SpritePosition {
  x: number;
  y: number;
  scale: number;
  scaleX: number; // 横スケール倍率（1.0=等倍、0.5=横半分）
  rotation: number; // 度
  depthOffset: number; // 深度バイアス（大きいほど手前に描画）
}

/** あるカメラ角度における全パーツの配置 */
export interface Keyframe {
  angle: number; // カメラ水平角度（0°=正面）
  leftEye: SpritePosition;
  rightEye: SpritePosition;
}

const DEFAULT_LEFT_EYE: SpritePosition = {
  x: -0.03,
  y: 0.015,
  scale: 0.015,
  scaleX: 1,
  rotation: 0,
  depthOffset: 0,
};

const DEFAULT_RIGHT_EYE: SpritePosition = {
  x: 0.03,
  y: 0.015,
  scale: 0.015,
  scaleX: 1,
  rotation: 0,
  depthOffset: 0,
};

export function createDefaultKeyframe(angle: number): Keyframe {
  return {
    angle,
    leftEye: { ...DEFAULT_LEFT_EYE },
    rightEye: { ...DEFAULT_RIGHT_EYE },
  };
}

export function createKeyframeFromCurrent(
  angle: number,
  current: Keyframe,
): Keyframe {
  return {
    angle,
    leftEye: { ...current.leftEye },
    rightEye: { ...current.rightEye },
  };
}

export const DEFAULT_KEYFRAMES: Keyframe[] = [createDefaultKeyframe(0)];

export function lerpSpritePosition(
  a: SpritePosition,
  b: SpritePosition,
  t: number,
): SpritePosition {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    scale: a.scale + (b.scale - a.scale) * t,
    scaleX: a.scaleX + (b.scaleX - a.scaleX) * t,
    rotation: a.rotation + (b.rotation - a.rotation) * t,
    depthOffset: a.depthOffset + (b.depthOffset - a.depthOffset) * t,
  };
}

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
      };
    }
  }

  return { ...sorted[0], angle };
}
