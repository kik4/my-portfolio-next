# 2D5D Modeling Tool 仕様 (2026-05-03)

## 0. この仕様の位置づけ

直前 spec ([_doc/20260430_0130/spec.md](../20260430_0130/spec.md)) が採っていた「頭メッシュ表面に anchor を貼り、各パーツが接平面上の 2D 板として回転していく」モデルを破棄し、より単純な 2 層モデルに切り替える。

破棄理由:
- パーツが頭メッシュにレイキャストでスナップされる構造は、輪郭線シェーダ（backface hull）の押し出しと干渉して z-fighting や視認性の問題を生んだ
- パーツ位置を 3D 多様体に縛ると「ある角度では頭表面、別の角度では空中に置きたい」自由度が出ない
- パーツ層と 3D 層の責務が混ざっており、補間ロジック（view RBF / anim RBF / group chain）の合成が複雑

過去 spec（参照のみ、実装は破棄）:
- [20260411_2231/spec.md](../20260411_2231/spec.md) — Billboard 2D 版
- [20260421_0108/spec.md](../20260421_0108/spec.md) — 3D 楕円体配置版
- [20260429_1638/spec.md](../20260429_1638/spec.md) — Catmull-Clark 制御メッシュ版
- [20260430_0130/spec.md](../20260430_0130/spec.md) — view-driven + 頭メッシュ多様体版（直前）

旧コードは本 spec 着手時に削除する。localStorage キーは `2d5d-modeling-data-v3` → `2d5d-modeling-data-v4`。

## 1. 目的

直前 spec の §1 を変更なし:

**「どの角度から見ても "アニメっぽくいい感じ" に見える疑似 3D キャラクターモデル」を作成するためのツール。**

3D として立体的に整合した形ではなく、各視点で 2D アニメ的に「気持ちよく見える」嘘を含んだ形を、視点（カメラ角度）に応じて連続的に変化させる仕組みを提供する。

## 2. レイヤ構造（責務分離）

直前 spec の §2 を変更なし。

| レイヤ | 役割 | 担当ツール |
|---|---|---|
| 静止モデル | 全角度で "いい感じ" な顔 | **本ツール** |
| 共通アニメ | 口開き等の単純なアニメ | **本ツール** |
| カット固有アニメ | 大胆なカット固有変形 | Unreal 上の別ツール（将来） |

## 3. 全体方針

### 3.1 二層構造（本 spec の核）

シーンは **2 層** で構成する:

- **パーツ層**: 純粋な 2D。`shape.basePoints`（2D 制御点列）と `affine`（2x3 アフィン行列）のみを持つ。3D の概念を持たない
- **グループ層**: 階層あり。**トップレベルのグループのみ** 3D 空間上の `anchor` 位置を持つ。すべてのグループは 2D アフィン変換を持ち、子全体に効く。グループは **完全ビルボード**（カメラに正対する 2D 平面を提供）

3D ↔ 2D の境界はトップグループ。トップグループは「3D 空間に貼られた、カメラに正対する画用紙」を表し、その上にネストグループ・パーツが純粋な 2D 構造として並ぶ。

### 3.2 強制関係

- すべてのパーツは何らかのグループの子（トップレベルのフリーパーツは禁止）
- トップレベルグループだけが `anchor: [x, y, z]` を持つ
- 子グループ（ネスト）は `anchor` を持たず、親グループの 2D 画用紙上に乗る
- 描画時の変換チェーン: `topGroup.affine ∘ ... ∘ leafGroup.affine ∘ part.affine` を `shape.basePoints` に適用 → 結果は 2D 平面上の点列 → トップグループの `anchor` を中心とした、カメラに正対するビルボード平面に貼って描画

### 3.3 嘘の入れ場所

嘘は引き続き「パーツ側」と「グループ側」の両方で吸収する:

- パーツの `affine` / `shape` を view 軸で変えれば、視点ごとの局所変形（横顔で目を細める等）が表現できる
- トップグループの `anchor` を view 軸で変えれば、視点ごとに「位置をずらす嘘」（横顔で口を顔の横に寄せる等）が表現できる
- グループの `affine` を view 軸で変えれば、子全体に効く視点別変形（横顔で目グループ全体を縮める等）

### 3.4 頭メッシュ

頭メッシュは引き続き存在するが、役割が変わる:

- 描画上のシルエット土台（顔の輪郭）として **そのまま描画する**
- パーツの anchor を貼る「3D 多様体」としては **使わない**（パーツに anchor 概念がそもそもない）
- ユーザーがトップグループの 3D anchor を編集する際の「視覚的なガイド」として置く意味合いが大きい

頭メッシュ自体の編集機能（HeadCurveEditor）はそのまま流用する。

### 3.5 編集 UI の中心

直前 spec の §3.3 を変更なし: 「カメラを回しながら、その視点での絵を直接編集する」が中心。view keyframe + anim keyframe の二軸補間も変更なし。

## 4. データモデル (FaceModel v4)

### 4.1 トップレベル

```ts
interface FaceModel {
  version: 4;
  head: HeadMesh;          // 直前 spec と同じ
  groups: Group[];          // フラット配列、parentId で階層を表現
  parts: Part[];            // フラット配列、各 part は groupId 必須
  animParams: AnimParamDef[];        // 直前 spec と同じ
  currentAnimParams: Record<string, number>;
}
```

不変条件:
- 全 `Part.groupId` は `groups` 内のいずれかの id を指す（オーファン禁止）
- グループツリーにサイクルなし
- ルート（`parentId == null`）グループのみ `anchor` フィールドを持つ
- 非ルートグループは `anchor` フィールドを持たない

### 4.2 Part（純 2D）

```ts
interface Part {
  id: string;
  name: string;
  groupId: string;          // 必須
  layerIndex: number;       // 兄弟内の描画順
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  shape: PartShape;         // basePoints + closed (直前 spec と同じ)
  // view × anim 二軸補間の対象
  viewKeyframes: PartViewKeyframe[];
  animKeyframes: PartAnimKeyframe[];
  rbfSigmaView: number;
  rbfSigmaAnim: number;
}

interface PartViewKeyframe {
  id: string;
  yaw: number;              // degree
  pitch: number;
  shape: PartShape;
  affine: AffineMatrix;     // [a, b, c, d, tx, ty]
  alpha: number;            // 0..1
  visible: boolean;
}

interface PartAnimKeyframe {
  id: string;
  paramValues: Record<string, number>;
  shapeDelta: [number, number][];  // basePoints と同じ長さ、加算
  affineDelta: AffineMatrix;       // 6成分加算
  alphaDelta: number;
}

type AffineMatrix = [number, number, number, number, number, number];
// [a, b, c, d, tx, ty] で行列
//   | a c tx |   | x |
//   | b d ty | × | y |
//   | 0 0  1 |   | 1 |
```

### 4.3 Group

```ts
type Group = RootGroup | ChildGroup;

interface RootGroup {
  id: string;
  name: string;
  parentId: null;
  visible: boolean;
  anchor: [number, number, number];        // 3D world position（ルートのみ）
  // view × anim 二軸補間の対象
  viewKeyframes: RootGroupViewKeyframe[];
  animKeyframes: RootGroupAnimKeyframe[];
  rbfSigmaView: number;
  rbfSigmaAnim: number;
}

interface ChildGroup {
  id: string;
  name: string;
  parentId: string;                        // 別の group の id
  visible: boolean;
  // view × anim 二軸補間の対象
  viewKeyframes: ChildGroupViewKeyframe[];
  animKeyframes: ChildGroupAnimKeyframe[];
  rbfSigmaView: number;
  rbfSigmaAnim: number;
}

interface RootGroupViewKeyframe {
  id: string;
  yaw: number;
  pitch: number;
  anchor: [number, number, number];
  affine: AffineMatrix;
  alpha: number;
  visible: boolean;
}

interface RootGroupAnimKeyframe {
  id: string;
  paramValues: Record<string, number>;
  anchorDelta: [number, number, number];
  affineDelta: AffineMatrix;
  alphaDelta: number;
}

interface ChildGroupViewKeyframe {
  id: string;
  yaw: number;
  pitch: number;
  affine: AffineMatrix;
  alpha: number;
  visible: boolean;
}

interface ChildGroupAnimKeyframe {
  id: string;
  paramValues: Record<string, number>;
  affineDelta: AffineMatrix;
  alphaDelta: number;
}
```

不変条件:
- `RootGroup.parentId === null`、`ChildGroup.parentId !== null`
- ルートグループの view keyframe は `anchor` を持つ、子グループの view keyframe は持たない
- ルート group の anim keyframe は `anchorDelta` を持つ、子 group の anim keyframe は持たない

### 4.4 アフィン行列の単位元

`affine: [1, 0, 0, 1, 0, 0]`（恒等変換）。`affineDelta: [0, 0, 0, 0, 0, 0]`（差分なし）。

ユーザー UI ではアフィンを以下の意味別パラメータで編集し、内部で合成して `[a, b, c, d, tx, ty]` に書き戻す:

- `scale: [sx, sy]`（デフォルト [1, 1]）
- `rotation: number`（degree、デフォルト 0）
- `shear: [shx, shy]`（デフォルト [0, 0]）
- `translate: [tx, ty]`（デフォルト [0, 0]）

合成順序は **scale → shear → rotation → translate**（パーツローカルからビルボード平面への合成）:

```
M = T(tx, ty) · R(θ) · Sh(shx, shy) · S(sx, sy)
```

具体的な行列:

```
S(sx, sy)   = | sx  0  0 |
              |  0 sy  0 |
              |  0  0  1 |

Sh(shx, shy) = | 1   shx  0 |
               | shy  1   0 |
               |  0   0   1 |

R(θ)  = | cos -sin 0 |
        | sin  cos 0 |
        |  0    0  1 |

T(tx, ty) = | 1 0 tx |
            | 0 1 ty |
            | 0 0  1 |
```

これらを上記順序で掛け合わせて 2x3 部分（`[a, b, c, d, tx, ty]`）を `affine` に格納する。

## 5. 描画パイプライン

### 5.1 シーン → スクリーンの流れ

1. グループツリーをルートから DFS で巡回
2. 各ルートグループについて:
   1. 現在の (yaw, pitch) で `viewKeyframes` を view RBF 補間 → `(anchor, affine, alpha, visible)` を取得
   2. 現在の anim params で `animKeyframes` を anim RBF 補間 → 各 delta を加算（`anchor + anchorDelta`、`affine + affineDelta` 6成分加算、`alpha + alphaDelta` を 0..1 にクランプ、`visible` は anim では変えない）
   3. ビルボード平面を構築: `anchor` を中心、カメラの右ベクトルを +X、上ベクトルを +Y、奥行きはカメラ視線方向に倒した平面
3. ルートグループの affine を初期累積アフィンとして、子要素を再帰描画
4. 子グループに入る時: 現在累積 × 子グループの補間後 affine
5. パーツに入る時: 現在累積 × パーツの補間後 affine。これを `shape.basePoints` の各点に適用 → 2D 平面上の点列。各点をビルボード平面の (X, Y) として 3D 座標に変換 → 三角化（earcut）して描画
6. パーツの最終 alpha = `groupChainAlpha × partAlpha`（チェーン上のすべての alpha を乗算）
7. パーツの `visible` がチェーン上で false なら描画しない

### 5.2 ビルボード平面の構築

ルートグループの `anchor: A` とカメラから:

```
right = camera.matrix.right     // カメラのワールド +X 方向（単位ベクトル）
up    = camera.matrix.up        // カメラのワールド +Y 方向
```

平面上の 2D 座標 `(x, y)` のワールド座標:

```
worldPos = A + x * right + y * up
```

Three.js では `<group position={A} quaternion={cameraQuaternion}>` のようにグループ自身をカメラ向きに揃えるか、各パーツを Sprite 風に手で構築する。実装は前者（コピー quaternion）が単純。

### 5.3 描画順序（layer / depth）

- 同じグループ内のパーツは `layerIndex` 昇順で描画
- グループ間の前後関係は **3D 深度** に従う（`anchor.z` が手前なら手前）
- 透過パーツは `depthWrite: false` + `depthTest: true`、輪郭線（line）は本体パーツと同じレイヤで描画

### 5.4 アフィン補間の方針

view RBF / anim RBF は引き続き Gaussian RBF。`affine` の 6 成分は **独立に線形補間** する（行列を decompose しない）。

- 利点: 実装が単純、加算 delta との整合がとれる
- 欠点: 90° と -90° の中間が「無回転」になる等、回転の補間が幾何的には不自然になりうる
- 対応: keyframe を密に置けば実用上問題ない。気になる場合はパーツ内に keyframe を追加して経路を明示する

## 6. 補間アルゴリズム

### 6.1 view RBF（直前 spec から流用、補間対象を変更）

球面距離 + Gaussian:

```
angle_i = great_circle_distance(camera_dir, keyframe_i_dir)
weight_i = exp(-(angle_i / σ)²)
result = Σ weight_i × value_i / Σ weight_i
```

補間対象:
- パーツ: `shape.basePoints[]` の各成分、`affine` の 6 成分、`alpha`、`visible`（重み 0.5 を閾値に bool）
- ルートグループ: `anchor` の 3 成分、`affine` の 6 成分、`alpha`、`visible`
- 子グループ: `affine` の 6 成分、`alpha`、`visible`

### 6.2 anim RBF（直前 spec から流用、補間対象を変更）

N 次元 Euclidean + Gaussian:

```
dist_i = || params - keyframe_i.paramValues ||  (各次元 0 補間で次元揃え)
weight_i = exp(-(dist_i / σ)²)
delta = Σ weight_i × delta_i        // 重みを正規化しない
```

view 結果に delta を加算:
- パーツ: `shape += shapeDelta`、`affine += affineDelta`（6 成分）、`alpha += alphaDelta`（クランプ）
- ルートグループ: `anchor += anchorDelta`、`affine += affineDelta`、`alpha += alphaDelta`
- 子グループ: `affine += affineDelta`、`alpha += alphaDelta`

`visible` は anim では変えない。

## 7. 編集 UI

### 7.1 主要パネル

- **左サイドバー**: PartTree（グループ + パーツの階層、＋ボタンで追加、選択切替）、AnimParamsPanel
- **右サイドバー**: 選択中ノードの編集 UI（PartEditor / RootGroupEditor / ChildGroupEditor）
- **メイン**: マルチビュー（4 ミニ + メインインタラクティブ、直前 spec から流用）

### 7.2 PartEditor

- view keyframe リスト + 「現在の視点で追加」+ 切替 + 削除
- 編集対象 view keyframe について:
  - PointEditor で `shape.basePoints` を 2D ドラッグ
  - アフィンフィールド（scale 2 値、rotation 1 値、shear 2 値、translate 2 値）→ 内部で 2x3 行列に合成して `affine` に書き戻し
  - alpha スライダー、visible トグル
- anim keyframe リスト + 「現在の anim 値で追加」+ 切替 + 削除
  - paramValues 編集
  - shapeDelta 編集（数値入力 or 重畳 PointEditor、後者は将来課題）
  - affineDelta 編集（意味別フィールド）
  - alphaDelta スライダー

### 7.3 RootGroupEditor

PartEditor と同じ構造。違いは:
- アフィンに加えて `anchor: [x, y, z]` も view keyframe ごとに編集可
- AnchorGizmo（drei `TransformControls` translate 3 軸）でメインビュー上から `anchor` を直接ドラッグ
- ドラッグ終了時のみコミット（直前 spec の AnchorGizmo の挙動を踏襲）

### 7.4 ChildGroupEditor

`anchor` がない以外は RootGroupEditor と同じ。

### 7.5 PartTree

- ルートグループ、子グループ、パーツを階層表示
- 各行でクリック選択（パーツ / グループ）
- 各行で親変更ドロップダウン（グループのみ。パーツは groupId を直接編集 = 別グループへの移動）
- 「＋ パーツ」「＋ ルートグループ」「＋ 子グループ」ボタン
- パーツ削除 / グループ削除（グループ削除は子を親に昇格）

### 7.6 操作の不変条件

- パーツ作成時に「どのグループに属するか」を必ず指定する。直近で選択中のグループがあればそれを既定値にする
- ルートグループに最後のパーツがなくなっても削除できる（ただし全空のモデルになるので警告）
- ルートグループを子グループに変える / 子グループをルートに昇格する操作は当面サポートしない（必要なら view keyframe の anchor 補完が要るので別途設計）

## 8. JSON I/O

### 8.1 シリアライズ形式

`FaceModel` をそのまま `JSON.stringify` する。version=4。localStorage キーは `2d5d-modeling-data-v4`。

### 8.2 ロード

- localStorage に v4 データがあればそれを使う
- v3 以前のデータは読み捨て（破壊変更、移行スクリプトなし）
- 「JSON ファイルから読込」ボタンで `version` フィールドを検査し、4 以外は拒否

## 9. 実装フェーズ

| Phase | 内容 |
|---|---|
| 1 | 旧コード（v3 実装）の整理。FaceModel v4 のスキーマ、defaultModel、jsonIO、useHistory、affine ユーティリティ。最小可動: 単一ルートグループ + 単一パーツが画面に出る |
| 2 | view RBF + 二軸補間ロジックの再実装（パーツ + ルートグループ + 子グループの補間対象を網羅） |
| 3 | 編集 UI（PartTree、PartEditor、RootGroupEditor、ChildGroupEditor、PointEditor、アフィンフィールド、AnchorGizmo） |
| 4 | マルチビュー、Undo/Redo、AnimParamsPanel、AnimKeyframeEditor。Unreal 出力 spec の v4 対応 |

## 10. 削除する旧概念

- `PartPlacement` 型（`anchor` が方向ベクトル、`offsetNormal/offsetTangent/rotationOffset/scale`）
- `resolvePlacement`（レイキャスト）
- `groupTransform.applyGroupChainToPlacement`（PartPlacement への delta 適用）
- raycast 全般（パーツ配置のための `THREE.Raycaster` 使用）
- `Part` の `viewKeyframes[].placement`
- `Part`（フリーパーツ）が groupId なしで存在できる仕様

## 11. 残す旧概念

- 頭メッシュ（HeadMesh + headMeshBuild + HeadCurveEditor + outlineMaterial）
- マルチビュー（MultiView + Scene + 固定 4 視点 + メインインタラクティブ）
- view RBF / anim RBF の数学（Gaussian、補間対象だけ差し替え）
- AnimParamDef / animParams レジストリ / currentAnimParams スナップショット
- PointEditor（パーツ shape の 2D ドラッグ、補間対象が変わるだけ）
- shapeTopology（点追加/削除を全 keyframe に伝播）
- AnchorGizmo（用途を「サーフェススナップなしの自由 3D 配置」に変更）
- Undo/Redo フック (`useHistory`)
- ortho カメラ + OrthoZoom（直前のちらつき対策で導入済み、流用）
- 左サイドバーのドラッグリサイズ
