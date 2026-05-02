# Unreal 連携: 出力フォーマット仕様 (2026-05-02)

## 0. この spec の位置づけ

本ツール ([app/2d5d-modeling/](../..)) で作成した FaceModel を、将来 Unreal Engine 上で再生する別ツール (キャラクタプレビュー / カット固有編集 / 最終レンダリング) で受け取れるようにするための、JSON 出力フォーマットとランタイム挙動の規定。

**本 spec は出力フォーマットとランタイム挙動だけを規定する。** Unreal 側ツールのスペック (UI、編集機能、レンダリング統合) は将来別 spec として書き起こす。

現行モデル spec: [20260430_0130/spec.md](../20260430_0130/spec.md)

## 1. 出力方針

### 1.1 そのままアプローチ

ツールが内部で持っている `FaceModel` (TypeScript 型は [_lib/types.ts](../../_lib/types.ts) に定義) を **そのまま JSON にシリアライズしたものをエクスポート形式とする**。

つまり:
- ツールの「JSON 書き出し」ボタンが出力するファイル
- ツールの localStorage に保存されている JSON
- Unreal が import する JSON

これらは全て同一スキーマ。

理由:
- ツールの初期段階でスキーマが頻繁に変わるため、変換層を挟むと一致管理コストが高い
- ランタイム最適化が必要なら、Unreal 側でロード時に内部表現に pre-bake すればよい
- ラウンドトリップ (export → import → 編集 → 再 export) で情報が落ちない

### 1.2 座標系の取り扱い

ツール内部は three.js 由来の **右手系 Y-up** (X 右、Y 上、Z 前):
- 頭の中心 = 原点
- カメラ正面 = +Z
- カメラから見て右 = +X
- 上 = +Y
- yaw = +Y 軸まわりの回転、yaw=0 が +Z 方向、yaw=90° が +X 方向
- pitch = 仰角、pitch=0 が水平、pitch=+90° が真上

Unreal は **左手系 Z-up** (X 前、Y 右、Z 上):
- (Unreal 座標) = (Tool 座標) を以下の写像で変換:
  ```
  Unreal.X =  Tool.Z       (前)
  Unreal.Y =  Tool.X       (右)
  Unreal.Z =  Tool.Y       (上)
  ```
- yaw / pitch は Unreal 側で同じ意味になる (yaw が水平回転、pitch が仰角)

**JSON 自体は Tool 座標系のまま** とし、Unreal 側でロード時に変換する。理由:
- ツール側で変換すると JSON を見たときに「どっちの座標系?」と毎回考える
- ロード時の一回変換は無視できる程度のコスト
- 将来 OpenXR や WebGL ターゲットを足すときに座標系が同じほうが楽

### 1.3 単位

ツール内部の長さは **無次元**。頭メッシュは概ね Y=-1.1〜1.0 の範囲に収まる規模。

Unreal 側で実寸にマッピングする時:
- 1 ツール単位 = 約 10〜20 cm (人物の頭サイズが Y=-1.1〜1.0 なら頭高 21 cm に近い場合 1 単位 ≈ 10 cm)
- 実プロジェクトでは Unreal 側ローダーに `scale` 設定を持たせて変換する

角度は全て度 (度)。クォータニオン等は使わない。

## 2. JSON スキーマ

`FaceModel.version === 3` のみが本 spec の対象。version は **breaking change のたびに整数を上げる**。後方互換性は保証しない (古い version は手動マイグレーションが必要)。

### 2.1 トップレベル

```ts
type FaceModel = {
  version: 3;
  head: HeadMesh;
  parts: Part[];
  groups: PartGroup[];
  animParams: AnimParamDef[];
  currentAnimParams: Record<string, number>;
};
```

`currentAnimParams` は **ツールのプレビュー用スナップショット**。Unreal ランタイムでは無視してよい (実行時にホスト側から anim パラメータが供給される想定)。エクスポート時に含めるかどうかはツール設定で選択可能にする予定 (現状は含む)。

### 2.2 HeadMesh

```ts
type HeadOutline = {
  enabled: boolean;
  color: string;        // CSS hex (#rrggbb)
  thickness: number;    // world units
};

type HeadMesh = {
  ySamples: number[];           // descending or ascending; same length as the next 3 arrays
  frontHalfXs: number[];        // half-width at each Y (X >= 0); 0 at apex/chin
  sideZFronts: number[];        // front-face Z at each Y; 0 at apex/chin
  sideZBacks: number[];         // back Z at each Y (negative or 0); 0 at apex/chin
  catmullRomTension: number;    // 0..1, 0.5 = standard
  ringSegments: number;         // longitude divisions per latitude ring
  fillColor: string;            // CSS hex
  outline: HeadOutline;
};
```

ランタイムは:
- ySamples を昇順にソートして頂上 = max Y、顎 = min Y を識別
- ySamples / front / side をそれぞれ Catmull-Rom で密にサンプリング (規定密度: 40 段)
- 各 Y で楕円断面を構築 (cosθ ≥ 0 では bFront、cosθ < 0 では bBack の半楕円接ぎ)
- ringSegments 分割で頂点を生成、隣接リング間で 4 角形 → 三角形 2 枚で stitch
- 法線は隣接面平均

詳細は [_lib/headMeshBuild.ts](../../_lib/headMeshBuild.ts) を参考実装と見なす。

### 2.3 Part

```ts
type PartShape = {
  basePoints: [number, number][];   // CCW
  closed: boolean;
};

type PartPlacement = {
  anchor: [number, number, number]; // unit direction from head center
  offsetNormal: number;
  offsetTangent: [number, number];
  rotationOffset: [number, number, number]; // [pitch, yaw, roll] degrees
  scale: [number, number];
};

type ViewKeyframe = {
  id: string;
  yaw: number;       // degrees
  pitch: number;     // degrees
  shape: PartShape;
  placement: PartPlacement;
  visible: boolean;
  alpha: number;     // 0..1
};

type AnimKeyframe = {
  id: string;
  paramValues: Record<string, number>;
  shapeDelta: [number, number][];   // same length as basePoints
  placementDelta: {
    anchorDelta: [number, number, number];
    offsetNormalDelta: number;
    offsetTangentDelta: [number, number];
    rotationOffsetDelta: [number, number, number];
    scaleDelta: [number, number];
  };
  alphaDelta: number;
};

type Part = {
  id: string;
  name: string;
  groupId?: string;
  layerIndex: number;        // sort key for draw order; lower drawn first
  fillColor: string;         // CSS hex
  strokeColor: string;       // CSS hex
  strokeWidth: number;       // world units; 0 = no stroke
  viewKeyframes: ViewKeyframe[];   // length >= 1
  animKeyframes: AnimKeyframe[];
  rbfSigmaView: number;      // degrees, view RBF Gaussian sigma
  rbfSigmaAnim: number;      // anim RBF Gaussian sigma in paramValues units
};
```

**不変条件**:
- `viewKeyframes.length >= 1`
- 同一パーツ内、全 `viewKeyframes[*].shape.basePoints` の長さは同じ
- 同一パーツ内、全 `animKeyframes[*].shapeDelta` の長さは `viewKeyframes[0].shape.basePoints.length` と同じ
- `anchor` は単位ベクトル (length ≈ 1)。ランタイムは defensively normalize すべき
- `paramValues` は疎 (定義されていない param は 0 として扱う)

ツール側はこれらを編集 UI で保証する ([_lib/shapeTopology.ts](../../_lib/shapeTopology.ts) など)。Unreal 側ランタイムも import 時に検証することを推奨。

### 2.4 PartGroup

```ts
type GroupTransformDelta = {
  anchorDelta: [number, number, number];
  rotationOffsetDelta: [number, number, number];   // degrees
  scaleDelta: [number, number];                    // multiplicative ((1+δ))
};

type GroupViewKeyframe = {
  id: string;
  yaw: number;
  pitch: number;
  transformDelta: GroupTransformDelta;
};

type GroupAnimKeyframe = {
  id: string;
  paramValues: Record<string, number>;
  transformDelta: GroupTransformDelta;
};

type PartGroup = {
  id: string;
  name: string;
  visible: boolean;
  parentId?: string;
  viewKeyframes: GroupViewKeyframe[];   // length >= 1
  animKeyframes: GroupAnimKeyframe[];
  rbfSigmaView: number;
  rbfSigmaAnim: number;
};
```

**不変条件**:
- `parentId` は他の `PartGroup.id` を指すか未指定 (top-level)
- 親子関係はサイクルを作らない (ランタイムも検証推奨)
- `viewKeyframes.length >= 1`

### 2.5 AnimParamDef

```ts
type AnimParamDef = {
  name: string;
  range: [number, number];   // for editor sliders only; runtime can ignore
  default: number;
};
```

ランタイムは `range` は無視してよい (UI 用ヒント)。`default` は paramValues に明示的な値が無い場合のフォールバック。

## 3. ランタイム補間アルゴリズム

ランタイムが各フレームで実装すべきパイプラインを定義する。実装言語に依存しない数式で書く。参考実装は本リポジトリの TypeScript 版 ([_lib/viewRbf.ts](../../_lib/viewRbf.ts), [_lib/animRbf.ts](../../_lib/animRbf.ts), [_lib/groupTransform.ts](../../_lib/groupTransform.ts), [_lib/placement.ts](../../_lib/placement.ts))。

### 3.1 入力

毎フレーム以下を与える:
- カメラ角度 `(yaw_cam, pitch_cam)` (度)
- アニメパラメータの現在値 `params: Record<string, number>`

### 3.2 view RBF (球面距離 + Gaussian)

`(yaw, pitch)` を球面上の単位ベクトルに変換:
```
v(yaw, pitch) = (cos(pitch) * sin(yaw), sin(pitch), cos(pitch) * cos(yaw))
```

二点間の距離 (球面角度):
```
d_sphere(a, b) = acos(clamp(v(a) · v(b), -1, 1))
```

N 個の view keyframe `K_1..K_N` における重み:
```
w_i = exp(-((d_i - d_min)^2) / (2 σ^2))
W = Σ w_i
weights_i = w_i / W                  // 正規化される (合計 1)
```
ここで σ は度をラジアンに変換 (`σ = sigmaDeg * π / 180`)。`d_min` を引くのは数値オーバーフロー防止のため (極小の重みでもゼロにならないようにする)。

**N == 1** の特殊ケース: weights = [1]。

### 3.3 view 補間

各 keyframe の各成分を上の weights で線形ブレンド:
- `shape.basePoints[k]` (k = 0..M-1): 重み付き平均
- `placement.anchor`: 重み付き平均 → 正規化
- `placement.offsetNormal`: 重み付き平均
- `placement.offsetTangent`: 重み付き平均
- `placement.rotationOffset`: 重み付き平均 (注意: 度単位の独立 3 成分。回転として正しくない近似だが許容)
- `placement.scale`: 重み付き平均
- `alpha`: 重み付き平均
- `visible`: `Σ weights_i * (visible_i ? 1 : 0) >= 0.5` で判定

### 3.4 anim RBF (Euclidean + Gaussian)

paramValues は疎な dict。距離計算は両 keyframe の paramValues のキー和集合で:
```
d2(a, b) = Σ_k (a[k] ?? 0 - b[k] ?? 0)^2
```

各 anim keyframe の重み (**正規化しない** — anim は base への delta なので独立寄与):
```
w_i = exp(-d2(K_i.paramValues, params) / (2 σ^2))
```

### 3.5 anim 合成

view 補間結果 `base` に、各 anim keyframe の delta を `w_i × delta_i` で加算:
- `shape.basePoints[k]`: `base + Σ w_i × shapeDelta_i[k]`
- `placement.anchor`: `base + Σ w_i × anchorDelta_i`、最後に正規化
- `placement.offsetNormal / offsetTangent / rotationOffset / scale`: 同様に加算
- `alpha`: 加算後 `clamp(0, 1)`
- `visible`: anim では変更しない (base のまま)

### 3.6 group チェーン適用

パーツの `groupId` から親を辿って ancestor chain を構築。各 group について:
- view RBF + anim 合成で `effective transformDelta` を解決
- placement に対して以下を accumulate:
  - `anchor += anchorDelta` (最後に正規化)
  - `rotationOffset += rotationOffsetDelta`
  - `scale *= (1 + scaleDelta)` (要素別)

**可視性**: chain 上のいずれかの group が `visible=false` ならパーツは非表示。

### 3.7 配置解決

最終的な placement (composed → group accumulated):

1. **頭メッシュ表面交差**: 頭中心 (原点) から `anchor` 方向に raycast。最近交差点を `surfacePoint`、面法線を `normal` とする。
2. **接平面**: `worldUp = (0, 1, 0)`。`|normal · worldUp| > 0.95` なら fallback で `referenceUp = (0, 0, 1)` を使う。それ以外は `referenceUp = worldUp`。
   - `bitangent = normalize(referenceUp - normal × (normal · referenceUp))`
   - `tangent = normalize(bitangent × normal)`
3. **最終位置**: `position = surfacePoint + offsetNormal * normal + offsetTangent.x * tangent + offsetTangent.y * bitangent`
4. **最終向き**:
   - 基底回転: local +Z → normal、local +Y → bitangent、local +X → tangent
   - これを `Matrix4.makeBasis(tangent, bitangent, normal)` でクォータニオンに
   - `rotationOffset` (度) を `XYZ` Euler で適用、`q_final = q_base * q_offset`

### 3.8 描画

- パーツは `position + quaternion` で配置された 2D 板ポリ (XY 平面)
- shape は `basePoints` × `scale` を CCW 三角化 (earcut 等)
- `layerIndex` 昇順で描画
- 頭メッシュは fillColor (FrontSide)、outline 有効時は同一ジオメトリを backface-hull (世界空間で `position + normalize(position) * thickness` 押し出し) で描画

## 4. 不変条件まとめ (ランタイムバリデータ向け)

| 項目 | 条件 |
|---|---|
| `version` | === 3 |
| `head.ySamples / frontHalfXs / sideZFronts / sideZBacks` | 全て同じ長さ |
| `head.ringSegments` | >= 6 |
| `parts[i].viewKeyframes.length` | >= 1 |
| `parts[i].viewKeyframes[*].shape.basePoints.length` | 全 keyframe で同じ |
| `parts[i].animKeyframes[*].shapeDelta.length` | viewKeyframes[0] と同じ |
| `parts[i].viewKeyframes[*].placement.anchor` | 単位ベクトルに近い (length 0.99..1.01) |
| `groups[i].parentId` | 他の groups[j].id を指すか undefined |
| group parent 関係 | サイクルを作らない |
| `groups[i].viewKeyframes.length` | >= 1 |

## 5. Unreal 側で実装が必要なもの

本 spec では具体実装は規定しないが、必要な構成要素を列挙:

1. **JSON ローダ + バリデータ**: 上記スキーマと不変条件を検証
2. **頭メッシュビルダ**: §2.2 の手順で `UProceduralMeshComponent` か Static Mesh を生成
3. **輪郭線マテリアル**: backface-hull push、または Unreal 標準の Outline post-process でも可
4. **パーツ描画コンポーネント**: 各パーツを `UProceduralMeshComponent` または Sprite として配置
5. **補間ランタイム**: §3 のアルゴリズムを毎フレーム実行
6. **anim パラメータ供給インターフェース**: ホストから `params` を受け取る (Blueprint からの API 等)
7. **座標系変換**: §1.2 のマッピングをロード時に適用

将来本 spec とは別の Unreal 側 spec で:
- 上記コンポーネントの C++ クラス設計
- Blueprint API
- カット固有変形を被せるための層 (現行 spec §2 の最上位レイヤ)

を規定する。

## 6. 拡張計画

将来 version を上げて追加する可能性があるもの:

| 候補 | 動機 |
|---|---|
| エッジ単位クリース | 頭メッシュで鋭い線 (顎) を制御点単位 sharpness より細かく |
| 頭メッシュの凹凸 (鼻) | spec §3.5 の判断と矛盾するので入れない方針 |
| 視点固有 anim | 「正面では blink、横顔では別の表情」のような cross-axis |
| マテリアル / テクスチャ | 現状 fillColor + alpha のみ。将来テクスチャを足すかも |
| ボーン / リギング | 現状なし。将来 Unreal Skeleton と連携する場合 |

破壊的変更が入る場合は `version` を 4 以上に上げ、後方互換変換は別途 migration スクリプトで対応する。
