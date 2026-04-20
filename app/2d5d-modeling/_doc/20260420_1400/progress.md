# 2D顔モデリングツール 作業進捗 (2026-04-20)

## 概要

Catmull-Rom 補間の「すべての制御点が同じ滑らかさで繋がる」制約を外し、**制御点ごとに 0〜1 の sharpness** を持てるようにした。0 で尖り（直線化）、1 で従来の滑らかさ。中間値で「ある程度だけ鋭い」が表現できる。

ブレンドシェイプ・ヨー/ピッチキーフレームにも sharpness の差分を持たせ、表情や向きで「尖り具合」をアニメーションできる。

## 本日のコミット

| SHA | 内容 |
|---|---|
| 08f0503 | 制御点ごとの sharpness による Catmull-Rom のコーナー化 |

## 機能詳細

### Point2D の 3 要素化

`Point2D` を `[number, number]` から `[number, number, number]` に拡張。3 要素目の意味は文脈で決まる:

- **basePoints**: sharpness、デフォルト 1.0（従来挙動）
- **blendShapes.deltas / yawPitchKeyframes.deltas**: sharpness の差分、デフォルト 0
- **FeatureKeyframe.position / FeatureGroupKeyframe.position など translation 系**: 未使用、便宜上 0 を埋める

「position に sharpness は意味がない」ため `Point2D` を別型に分けることも検討したが、既存のユーティリティ・補間関数・UI 側の2要素リテラルが至る所にあり、統一して 3 要素に揃えた方が影響箇所を一度に片づけられると判断して統一型を選んだ。

### Catmull-Rom の Hermite 化

[catmullRom.ts](app/2d5d-modeling/_lib/catmullRom.ts) を書き換え、標準 Catmull-Rom 基底から **Hermite 基底** に変更。

- 各区間 `p1 → p2` について、両端の接線 `m1, m2` に p1, p2 の sharpness (`s1, s2`) をスケール係数として掛ける
  - `m1 = 0.5 * s1 * (p2 - p0)`
  - `m2 = 0.5 * s2 * (p3 - p1)`
- sharpness = 1 で従来と完全に一致（Uniform Catmull-Rom の接線そのもの）
- sharpness = 0 で接線がゼロ → その端で直線化し尖る
- 非対称（片側だけ鋭く）も可能。各区間で s1, s2 を個別に読む

これにより「完全な尖り」「完全な滑らか」の二値ではなく、中間の **マイルドな尖り** が点ごとに表現できる。

### 補間パイプラインへの伝搬

sharpness は点に紐づく属性として、ブレンドシェイプ・キーフレーム補間を通して自然に運ばれる。

- **applyBlendShapes** ([applyBlendShapes.ts](app/2d5d-modeling/_lib/applyBlendShapes.ts)): basePoints の sharpness に `Σ (bs.deltas[i][2] * weight)` を加算
- **interpolateOutline** ([interpolateOutline.ts](app/2d5d-modeling/_lib/interpolateOutline.ts)): RBF に渡す `values` を 2 成分（dx, dy）から 3 成分（dx, dy, dSharpness）に拡張。補間結果を blended.sharpness に加算
- **interpolateFeature / featureGroup**: 形状の sharpness は basePoints 経由で引き継ぐだけ（affine 変換は sharpness に作用しない。KF の position は 3 要素目を 0 固定）

補間の結果得られた sharpness 値は `subdivideClosed` が最終的に読み取って、その区間の尖り具合に反映する。

### PointEditor の選択＋スライダー

[PointEditor.tsx](app/2d5d-modeling/_components/PointEditor.tsx) に点選択の UI を追加。

- ハンドルをクリックすると `selectedPointIndex` にセット。選択中の点は青い太枠 + 半径 8 で強調表示
- SVG 下部にバー状の UI 領域を追加し、選択中のみ sharpness スライダー（0〜1、step 0.01）と × 閉じるボタンを表示
- 点の右クリック削除時には選択を解除

既存のドラッグ系操作（点移動・全体 move / rotate / scale）は sharpness を保持するように map コールバックの分割代入を `[px, py, ps]` に拡張。辺クリックによる点挿入では両隣の sharpness を線形補間して新点に付与。

### 後方互換（JSON 入出力）

[jsonIO.ts](app/2d5d-modeling/_lib/jsonIO.ts) の `importFaceModel` で、2 要素のみの旧 JSON を自動パディング:

- `padPoints(raw, 1)`: basePoints 用。sharpness 未指定なら 1.0
- `padPoints(raw, 0)`: blendShapes.deltas / yawPitchKeyframes.deltas 用。差分なしとして 0
- `padPosition(raw)`: FeatureKeyframe.position / FeatureGroupKeyframe.position 用。3 要素目は 0

これにより既存の保存データが壊れず、新しい JSON でも 3 要素形式で書き出される（`JSON.stringify` はそのまま `[x, y, s]` を出す）。

## データモデル差分

### types.ts

```ts
// 旧
export type Point2D = [number, number];

// 新
export type Point2D = [number, number, number];
// basePoints:       [x, y, sharpness]    — sharpness default 1
// deltas (BS / KF): [dx, dy, dSharpness] — dSharpness default 0
// position など:     3rd slot 無視（慣習的に 0）
```

データ構造自体（`OutlinePolygon.basePoints: Point2D[]` 等）は変わらないため、型定義のツリーは shape 互換のまま 3 要素化された。

## 性質・注意点

- sharpness の補間は RBF モードの場合、他の座標成分と同じようにオーバーシュートし得る（sharpness が一時的に 0 未満 / 1 超になる瞬間がある）。最終的に `subdivideClosed` 側で `clamp01` してから接線スケールに使うので見た目は破綻しない
- basePoints.sharpness は点ドラッグ中も保持される（index ベースで該当点の 3 要素目を引き継ぐ）
- 「完全な尖り」が欲しい場合は 0 を、従来挙動のままでよい点は 1 を指定。既存データは全点 1 として読み込まれるので見た目は変化しない

## 今後の候補（未実装）

- earcut インデックス焼き込み
- 特徴ポリゴンのミラー機能
- 複数キャラ配置
- 3D髪メッシュ + 前髪遮蔽
- Masked マテリアル
- フィーチャーポリゴンの (yaw, pitch) KF で matrix を直接編集する UI
- KF 手動並び替え（現状は pitch/yaw による自動ソート）
- 首モデルプレビュー（spec: [20260419_0100/spec.md](app/2d5d-modeling/_doc/20260419_0100/spec.md)）
- Unreal 移植用 C++ リファレンス実装
