export interface EyeParams {
  horizontalOffset: number; // 水平位置
  verticalOffset: number; // 垂直位置
  spacing: number; // 左右の間隔
  scale: number; // サイズ
  rotation: number; // 回転（度）
}

export interface BrowParams {
  horizontalOffset: number;
  verticalOffset: number;
  spacing: number;
  rotation: number;
}

export interface AutoOffsetParams {
  enabled: boolean;
  horizontalStrength: number; // 水平オフセットの強さ
  scaleStrength: number; // サイズ変化の強さ
  spacingStrength: number; // 間隔変化の強さ
}

// 顔メッシュの基準座標（glTFローカル座標系）
export const FACE_BASE_Y = 1.548;
export const FACE_FRONT_Z = 0.075;

export const DEFAULT_EYE_PARAMS: EyeParams = {
  horizontalOffset: 0,
  verticalOffset: 0.075, // 目ボーンY(1.623) - FACE_BASE_Y(1.548)
  spacing: 0.018, // 目ボーンX ≈ ±0.018
  scale: 0.015,
  rotation: 0,
};

export const DEFAULT_BROW_PARAMS: BrowParams = {
  horizontalOffset: 0,
  verticalOffset: 0.09, // 目の少し上
  spacing: 0.018,
  rotation: 0,
};

export const DEFAULT_AUTO_OFFSET: AutoOffsetParams = {
  enabled: false,
  horizontalStrength: 0.5,
  scaleStrength: 0.3,
  spacingStrength: 0.3,
};
