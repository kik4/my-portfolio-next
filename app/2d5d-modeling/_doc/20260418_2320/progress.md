# 2D顔モデリングツール 作業進捗 (2026-04-18)

## 概要

キーフレーム補間の挙動に対する不満点を解消し、輪郭影という新しいポリゴン種を追加した。

## 本日のコミット（新しい順）

| SHA | 内容 |
|---|---|
| dfdba6d | 輪郭影ポリゴン（輪郭領域でクリップ） |
| 86dcb69 | 作成後のキーフレーム角度を編集可能に |
| fd0c70f | キーフレーム一覧を pitch 昇順・yaw 昇順でソート |
| 1515c42 | 新規輪郭KFを現在の表示形状で初期化 |
| 82a5363 | キーフレーム補間モードを選択式に |

## 機能詳細

### 補間モード切替（82a5363）

RBF Gaussian の「行き過ぎ（オーバーシュート）」で形状が暴れる問題への対処として、モデルごとに補間方式を選べるようにした。

- 新規 enum `InterpolationMode`: `"rbf-gaussian" | "rbf-gaussian-regularized" | "linear-delaunay"`
- `FaceModel.interpolationMode` を必須フィールドに
- `rbf.ts` の `buildRBFInterpolator` に Tikhonov 正則化パラメータ `lambda` を追加（Φ + λI を解く）
- `linearDelaunay.ts` 新規: `delaunator` で2D Delaunay 三角分割、三角形内は重心座標で線形補間、外側は最近傍にクランプ。1点・2点ケースも個別処理
- `buildInterpolator.ts` 新規: mode から3つの builder を切り替える共通ファクトリ。正則化 λ=0.05
- `interpolateOutline.ts` / `interpolateFeature.ts` / `featureGroup.ts` の全補間関数が `mode` 引数を受ける
- `buildGeometry.ts` は `model.interpolationMode` を読んで全てに流す
- `jsonIO.ts` で読み書き、未指定/不正値は `rbf-gaussian` にフォールバック
- 左ペイン「表示設定」の上に select UI を追加

**性質の違い**:
- RBF Gaussian: 滑らか・オーバーシュートあり（現状の挙動）
- RBF Gaussian 正則化: KF を厳密には通らないがオーバーシュートを減らす
- Linear (Delaunay): オーバーシュートなし（凸結合のみ）・KF間で角張る

### 新規KFを現在の表示で初期化（1515c42）

これまで輪郭KFを追加すると deltas が全ゼロ初期化され、追加した瞬間に見た目が正面ベースへスナップしていた。

- `addKeyframe` で `interpolateOutlinePoints` を呼び、補間結果 − basePoints を deltas に焼き込む
- 中央ペインの KF 編集中に「KF をベースで初期化（差分ゼロ）」ボタンを追加（旧挙動を残すため）
- Linear モードでは厳密に「見たまま固定」。RBF モードでは他KFの重み再計算で多少動く

### KF 一覧のソート（fd0c70f）

コンポーネント冒頭に純粋関数 `sortedKeyframeIndices` を追加。ポリゴンKF・FeatureGroupKF 両方の `.map((kf, i) => ...)` を `sortedKeyframeIndices(...).map(i => { const kf = ...; ... })` 経由に書き換え、元のインデックスを保持したまま表示順だけを変える。

順序: **pitch 昇順、同値のとき yaw 昇順**。

### KF 角度の後編集（86dcb69）

KF 一覧の各行に yaw/pitch の数値 input を追加。カメラジャンプは `→` ボタンに短縮して併存。

- ポリゴンKF: `updateSelectedPolygon` 経由で angle を更新
- FeatureGroupKF: `setFeatureGroups` 直接書き換え
- 重複チェックなし（ユーザー責任）

### 輪郭影ポリゴン（dfdba6d）

顔輪郭の内側だけに描画される影形状。新種として追加した。

- `types.ts`: `OutlineShadowPolygon` を新規定義（`group: "outlineShadow"`）。OutlinePolygon と同じ KF・BS・mirrorSymmetric に加え `fillColor` と `baseAlpha` を持つ
- `Polygon` union に追加
- `interpolateOutlinePoints` は `OutlinePolygon | OutlineShadowPolygon` 両対応に変更
- `buildGeometry.ts` は2パス構造に変更:
  - 1パス目: shadow 以外を従来通り処理。shadow は補間だけ済ませてキューへ
  - 共通: 全 outline を `polygon-clipping` で union
  - 2パス目: 各 shadow を outline union と `intersection` → 三角分割 → transparent fill として出力
- 既存コードで複製されていた union 計算を共通化（`outlineUnion`）
- UI:
  - `PolygonTree` に「+ 輪郭影」ボタン追加、ツリー内に「輪郭影」ラベルで表示
  - `createOutlineShadowPolygon` ファクトリ（楕円、黒 α=0.3）
  - 属性編集 UI: 色（color input）、α（range）、左右対称トグル
  - `editorPoints` / `handleEditorChange` / `addKeyframe` / ゼロ初期化ボタン が outline と同じフローで shadow にも適用
- JSON 互換: group がそのまま保存・読み込みされるので追加変換なし

## データモデル差分

### types.ts

```ts
// 新規
export interface OutlineShadowPolygon {
  id: string;
  name: string;
  group: "outlineShadow";
  basePoints: Point2D[];
  layerIndex: number;
  fillColor: ColorRGBA;
  baseAlpha: number;
  yawPitchKeyframes: OutlineKeyframe[];
  blendShapes: OutlineBlendShape[];
  mirrorSymmetric?: boolean;
}

export type InterpolationMode =
  | "rbf-gaussian"
  | "rbf-gaussian-regularized"
  | "linear-delaunay";

// 変更
export type Polygon = OutlinePolygon | OutlineShadowPolygon | FeaturePolygon;

export interface FaceModel {
  // ... 既存 ...
  interpolationMode: InterpolationMode; // 必須
}
```

## 新規ファイル

- `_lib/buildInterpolator.ts` — 補間モード切替ファクトリ
- `_lib/linearDelaunay.ts` — Delaunay + 重心座標補間

## 今後の候補（未実装）

- earcut インデックス焼き込み
- 特徴ポリゴンのミラー機能
- 複数キャラ配置
- 3D髪メッシュ + 前髪遮蔽
- Masked マテリアル
- フィーチャーポリゴンの (yaw, pitch) KF で matrix を直接編集する UI
- Unreal 移植用 C++ リファレンス実装
- KF 手動並び替え（現状は pitch/yaw による自動ソート）
