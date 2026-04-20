# 2D顔 × 3Dボディ アニメ表現ツール - 企画書（3D 版）

このドキュメントは現行 spec ([20260411_2231/spec.md](../20260411_2231/spec.md)) の後継として書かれた、**3D 空間での顔パーツ配置** に基づく新方針である。現行 spec は保存用に残す。

## 目的

スクリーンスペース的な 2D 板ポリ Billboard 方式では、**カメラロールと真上視点の連続性** が構造的に解決困難であることが判明した。本 spec では顔全体を 3D 空間内で構成することで、透視投影が自然にロールを吸収する構造に切り替える。

一方で、アニメ調の「2Dの嘘」（斜め顔で目を正面寄りに寄せる、横顔で輪郭を誇張する等）は **可能な範囲で** 保つ。完全な物理的正しさではなく、3D で破綻しない枠組みの上に 2D 的な嘘を積む。

最終的な移植先は引き続き **Unreal Engine**。製作ツールと移植先で同一のレンダリング仕組みを使うことを最優先とする。

## 旧 spec との差分サマリ

| 観点 | 旧 (Billboard 2D) | 新 (3D 配置) |
|---|---|---|
| 描画単位 | 顔全体 1 枚の Masked メッシュ | 頭メッシュ + 複数の 3D 配置板ポリ |
| カメラ姿勢 | カメラ正対 Billboard | 通常の 3D 透視カメラ |
| ロール対応 | Billboard Z 回転で誤魔化す（連続性なし） | 3D 透視投影が自動処理（連続） |
| 前後遮蔽 | layerIndex + ローカル Z オフセット | 深度バッファ（自然） |
| 奥目の遮蔽 | 輪郭グループの遮蔽マスクポリゴン | 頭メッシュの 3D 形状が自動遮蔽 |
| 形状 KF | 2D 点列の差分 / アフィン | 2D 板ポリ形状 + 3D 位置・向きの差分 |
| 補間キー | (yaw, pitch) 2D RBF | (yaw, pitch) 2D RBF（変更なし） |
| 既存データ | — | **破棄。互換性なし** |

## 基本方針

### 頭ベースメッシュ（3D）

顔の土台となる **のっぺらぼうの 3D 頭メッシュ** を動的に生成する。

- 最小構成は **楕円体ベース** に顎テーパー等の簡単な変形を加えたもの
- 将来拡張として、正面/横の断面プロファイルからのスイープ、名前付きパラメータによるヘッドブループリント、などに拡張余地を残す
- 肌色塗りと（後述の）輪郭線を兼ねる

頭メッシュは **顔輪郭そのものの役割を担う**。旧 spec の OutlinePolygon 概念は廃止。

ただし「嘘の輪郭」を作るため、頭メッシュだけでは出せない輪郭（例: 横顔の鼻筋から顎にかけての誇張されたシルエット）は **パーツ板ポリ** に担当させる。

### パーツ板ポリ（3D 空間に配置された 2D 板ポリ）

目・鼻・口・眉・まつ毛・頬紅などの「パーツ」は、**3D 空間内に位置と向きを持って配置された 2D 板ポリ** として扱う。

- 各パーツは 2D 閉じた点列（現行の Polygon と同じ概念）を形状として持つ
- その板ポリは 3D 空間の **原点 (position: Vec3)** と **向き (orientation: quaternion)** を持つ
- カメラに正対するのではなく、自身の orientation に従って 3D 空間で傾いている
- 3D 透視投影により、カメラから見た見かけはカメラ位置に応じて変化する（真上から見れば斜めから見た板ポリ、正面から見れば正対した板ポリ）

板ポリの向きは **ハイブリッド指定**:
- 基本は頭メッシュの表面法線に従う（自動算出）
- そこからの **手動オフセット角度**（yaw/pitch/roll 各軸）で調整可能
- これにより「板ポリをカメラ寄りに傾けて正面見え寄せする」「鼻板ポリを前方に突き出す」等の調整ができる

### KF の役割（3D 位置・向き・形状すべて）

(yaw, pitch) KF は現行と同様に 2D 空間（カメラから見た顔向き）で補間するが、**保持する値が拡張される**:

| KF が持つ値 | 用途 |
|---|---|
| **形状差分** (Point2D[]) | 板ポリ内の 2D 点列の位置差分。従来どおり |
| **位置差分** (Vec3) | 3D 空間での板ポリ原点のオフセット。「斜め顔で目を寄せる」等の嘘演出 |
| **向き差分** (quaternion or Euler) | 板ポリ法線の傾き。カメラ寄せ等 |
| **α** (feature 系のみ) | 透明度。従来どおり |

補間は現行通り **2D RBF / Linear-Delaunay**。キー空間は (yaw, pitch) のまま。roll は 3D 透視投影が吸収するので KF 側には入れない（案 α）。

### カメラロールの扱い

カメラロールは **形状 KF の入力に含めない**。代わりに、3D 透視投影が自然に処理する:

- カメラをロールさせる = world がカメラ空間で回転する
- 頭メッシュ・パーツ板ポリはすべて world 固定の 3D オブジェクト
- 結果として、画面上では頭もパーツも一体となって回転する
- 真上視点・正面視点を問わず、連続性が保たれる

### 「2Dの嘘」の表現手段

旧 spec では Billboard 2D 変形で嘘をつけた。新 spec では以下の手段で嘘を実現する:

| 嘘 | 表現手段 |
|---|---|
| 斜め顔で目を正面寄りに見せる | KF で目板ポリの 3D 位置をカメラ寄りに、向きをカメラ側に傾ける |
| 横顔で鼻先を誇張 | KF で鼻板ポリの形状・位置を強調方向に |
| 横顔の顎から鼻筋への誇張輪郭 | 専用の「輪郭演出」用パーツ板ポリを配置し、KF で角度に応じて形状・α を変化させる |
| 目・口の表情変化 | 形状 KF + ブレンドシェイプ（従来どおり） |

旧 spec でできたことの完全再現は保証しない。試作を進めながら「この嘘は作れる/作れない」を見極め、必要なら構造を拡張する。

## データ構造

### 基本型

```ts
type Vec2 = [number, number];
type Vec3 = [number, number, number];
type Quaternion = [number, number, number, number]; // [x, y, z, w]
type ColorRGBA = [number, number, number, number];

interface YawPitch {
  yaw: number;
  pitch: number;
}
```

### 頭ベース（パラメトリックメッシュ）

```ts
// Phase 1: 楕円体ベース
interface HeadParams {
  // 基本寸法
  width: number;       // 横幅（X 軸半径）
  height: number;      // 縦の半分（Y 軸半径）
  depth: number;       // 前後（Z 軸半径）

  // 顎テーパー
  jawNarrowing: number;  // 下半分の横幅縮小率 (0 = テーパーなし、1 = 先端が尖る)
  jawAngle: number;      // 正面から見た顎先の角度（degrees、0 で楕円のまま）

  // 頭頂テーパー（後回しでも可）
  topNarrowing?: number;

  // 生成メッシュの分割数
  segmentsU?: number;  // 横方向
  segmentsV?: number;  // 縦方向
}

interface HeadModel {
  params: HeadParams;
  // materialFillColor は FaceModel 側で持つ（旧 outlineFillColor と同等）
}
```

将来拡張用途として、`HeadParams` の discriminated union で断面プロファイル型・ヘッドブループリント型を足せる構造にする。

### パーツ板ポリ

```ts
// 3D 空間での板ポリ配置
interface PartPlacement {
  // 基本配置（頭メッシュ表面に自動で貼り付ける基準点）
  // 頭メッシュ上の UV 座標 or 方向ベクトルで指定
  anchor: Vec3;        // 頭中心から見た方向ベクトル（正規化）

  // 基準配置からのオフセット
  offsetNormal: number;     // 表面法線方向のオフセット（正で表面から離れる）
  offsetTangent: Vec2;      // 表面接平面上のオフセット
  rotationOffset: Vec3;     // 接平面座標系での roll/pitch/yaw 追加回転 (degrees)
}

// 2D 板ポリ形状
interface PartShape {
  basePoints: Vec2[];          // 板ポリ ローカル 2D 座標での点列
  layerIndex: number;          // 板ポリ同士の前後整合（板ポリ法線方向のオフセット）
  // 旧 Point2D と同じく、sharpness は将来拡張で 3 要素目に入れられる
}

interface PartKeyframe {
  angle: YawPitch;
  // 形状差分
  deltas: Vec2[];              // basePoints と同じ長さ
  // 3D 配置の差分
  positionDelta: Vec3;         // PartPlacement 基準からの 3D 位置差分
  orientationDelta: Quaternion; // 向きの差分（基準からのデルタ回転）
  // α（feature 系のみ使用）
  alpha: number;
}

interface Part {
  id: string;
  name: string;

  // 機能分類: 旧 spec の outline/feature 区別の代替
  kind: "feature" | "outline-decoration";
  // - "feature":          従来の目・口・鼻線・頬紅等。α 制御あり
  // - "outline-decoration": 横顔の誇張輪郭など、頭メッシュに足し込む輪郭演出

  placement: PartPlacement;
  shape: PartShape;

  fillColor: ColorRGBA;
  fillEnabled: boolean;
  strokeColor: ColorRGBA | null;
  strokeWidth: number;

  baseAlpha: number;

  yawPitchKeyframes: PartKeyframe[];
  blendShapes: PartBlendShape[];

  // Part をグループで束ねる場合
  groupId?: string;
}

interface PartBlendShape {
  id: string;                      // "blink", "smile" など
  deltas: Vec2[];                  // 形状差分
  positionDelta?: Vec3;            // 3D 位置差分（オプション）
  orientationDelta?: Quaternion;   // 向き差分（オプション）
  alphaDelta?: number;             // α 差分
}
```

### グループ（旧 FeatureGroup 相当）

```ts
interface PartGroupKeyframe {
  angle: YawPitch;
  positionDelta: Vec3;
  orientationDelta: Quaternion;
}

interface PartGroup {
  id: string;
  name: string;
  yawPitchKeyframes: PartGroupKeyframe[];
  // 可視範囲（旧 visibility と同じ）
  visibility: {
    yawRange: [number, number];
    pitchRange: [number, number];
  };
  // layerIndex 系は深度バッファに任せるので削除
}
```

旧 spec の `layerIndexKeyframes`（向き依存の描画順入れ替え）は廃止。3D 配置なら深度バッファが自動で解決する。

### キャラ全体

```ts
type InterpolationMode =
  | "rbf-gaussian"
  | "rbf-gaussian-regularized"
  | "linear-delaunay";

interface FaceModel {
  head: HeadModel;
  headFillColor: ColorRGBA;

  parts: Part[];
  groups: PartGroup[];

  blendShapeWeights: Record<string, number>;
  interpolationMode: InterpolationMode;

  // 頭の全体線画（トゥーン風輪郭）を描くか等の設定は Phase 2 以降
}
```

## データ層の処理フロー

```
各パーツ Part について:
  1. ブレンドシェイプ適用（形状差分・位置差分・向き差分・α 差分の重み付き加算）
  2. (yaw, pitch) KF から補間して形状差分・位置差分・向き差分・α を取得
     - カメラからのキャラローカル (yaw, pitch) を入力として RBF 補間
  3. placement.anchor から頭メッシュ表面の基準点・基準向きを算出
  4. 基準点に位置差分を加え、基準向きに向き差分を合成 → 3D 空間での実配置
  5. shape.basePoints + blend + KF deltas → 板ポリのローカル 2D 点列
  6. Catmull-Rom 細分割（既存どおり）
  7. earcut 三角形化（既存どおり）
  8. 板ポリを placement の 3D 位置・向きに配置して BufferGeometry に詰める

頭メッシュ:
  HeadParams から頂点配列を生成（楕円体 + 顎テーパー 等）
  → 単純な MeshBasicMaterial 等で描画（Phase 1）

描画:
  通常の 3D 透視カメラで、頭メッシュ + 各パーツ板ポリを描画
  深度バッファが前後関係を自動解決
```

## レンダリング層の設計

### Phase 1

- **頭メッシュ**: MeshBasicMaterial で肌色塗り。陰影なし（アニメ絵に陰影を直接描くのは後段）
- **パーツ板ポリ**: Part 単位で BufferGeometry。`kind === "feature"` は `baseAlpha × kf.alpha × blend.alpha` で透明度制御
- **輪郭線**: Phase 1 ではナシ。ベタ塗り頭メッシュのシルエットが輪郭を兼ねる
- **前後整合**: 深度バッファ。同一パーツ内では板ポリ法線方向に layerIndex × ZSTEP のオフセットを与えて Z-fighting を回避
- **カメラ**: 透視投影（OrbitControls、既存どおり）。Billboard は廃止

### Phase 2 以降

- **トゥーン風輪郭**: 頭メッシュの外周に描画される黒線。post-processing で Sobel / 法線エッジ検出 or InverseHull シェル
- **トゥーン陰影**: 頭メッシュを MeshToonMaterial 化 or 独自シェーダ
- **前髪 3D メッシュ**: 頭の前に配置。深度バッファで自動遮蔽
- **複数キャラ**

## Unreal 移植時の対応表

### 変わらない（TS と C++ で同じ実装を書く）

- FaceModel / Part / PartGroup / HeadParams のデータ構造（JSON で共有）
- ブレンドシェイプ適用
- 2次元 RBF / Linear-Delaunay 補間
- パーツ配置の計算（anchor → 表面点、オフセット適用、KF 差分合成）
- 頭メッシュの生成式（楕円体 + テーパー）
- Catmull-Rom 細分割
- earcut または焼き込み済みインデックス

### 変わる（各プラットフォームの API に置換）

- BufferGeometry ↔ ProceduralMeshComponent / DynamicMeshComponent
- 板ポリの SceneComponent 階層配置
- 頭メッシュ描画
- 編集 UI（UE 側には存在しない）

### 旧 spec からの Unreal 対応の変化

- 旧: 「顔全体が 1 枚の Masked メッシュ + Billboard」→ UE 側で専用実装が必要
- 新: 「通常の 3D メッシュ群」→ UE の ProceduralMeshComponent を普通に並べるだけ。Billboard 処理不要、レンダリング設定はアニメ調プロジェクトの通常構成で済む

## 編集 UI（Phase 1）

- **頭パラメータ編集**: HeadParams の各数値を入力でき、リアルタイムでメッシュ再生成
- **パーツ追加/削除/編集**
  - placement.anchor を 3D ピッカーで指定（頭メッシュ上をクリック）
  - offsetNormal / offsetTangent / rotationOffset を数値 or ジズモで調整
  - 2D 形状エディタ（現行 PointEditor を流用可能）
- **KF 追加/編集/削除**: 現行の UI ベース。保存する値が増えたので入力欄は拡張
- **カメラ操作**: 現行 OrbitControls ベース。ロール操作は不要（3D が自動処理する）

## 最小構成（Phase 1）

1. データ層
   - HeadParams から楕円体ベースメッシュを生成する関数
   - ブレンドシェイプ適用（形状・位置・向き・α の差分合成）
   - 2次元 RBF 補間（形状・3D position・3D orientation・α を独立に補間）
     - orientation の補間は quaternion の slerp ではなく、差分 quaternion の各成分を線形 RBF 補間して正規化（KF 同士の差が小さい前提）。破綻するなら slerp へ切替
   - パーツ板ポリの配置計算（anchor → 表面点 + オフセット）
   - Catmull-Rom 細分割、earcut
2. レンダリング層
   - 頭メッシュ MeshBasicMaterial
   - パーツ板ポリ生成（fill のみ、α あり）
   - 通常の 3D 透視カメラ + OrbitControls
3. 編集 UI 層
   - HeadParams 編集
   - パーツ追加/削除、placement 編集、形状編集
   - (yaw, pitch) KF の追加/編集/削除（3D 配置差分も入力）
   - ブレンドシェイプの追加/編集/削除
   - 重みスライダー
4. 既存の [Scene.tsx](../../_components/Scene.tsx) [FaceMesh.tsx](../../_components/FaceMesh.tsx) [ModelingTool.tsx](../../_components/ModelingTool.tsx) 等は **全面書き換え**

## 発展（Phase 2 以降）

- トゥーン風輪郭線（post-process or InverseHull）
- トゥーン陰影（頭メッシュ / パーツに投影）
- 頭パラメータの拡張（断面プロファイル、ヘッドブループリント）
- 前髪 3D メッシュと遮蔽
- 複数キャラ配置
- JSON 入出力（現行の jsonIO を新データ構造に合わせて書き直し）
- earcut インデックス焼き込み
- Unreal 移植用 C++ リファレンス実装
- ブレンドシェイプの 3D 配置差分の本格運用

## 変更のスコープ

**既存の全コンポーネントを置き換える**。具体的には以下のファイルが対象:

- `_lib/types.ts` — 完全に新データ構造へ
- `_lib/applyBlendShapes.ts` — 3D 差分対応
- `_lib/interpolateOutline.ts` / `interpolateFeature.ts` / `featureGroup.ts` — Part 向けに再構成
- `_lib/buildGeometry.ts` — 頭メッシュ + パーツ板ポリ生成に書き換え
- `_lib/jsonIO.ts` — 新スキーマ対応
- `_components/Scene.tsx` / `FaceMesh.tsx` — Billboard 廃止、通常 3D レンダリング
- `_components/ModelingTool.tsx` — 編集 UI の拡張
- `_components/PointEditor.tsx` — 2D 形状エディタとして流用、3D 配置編集用の別コンポーネント追加

**既存 JSON データとの互換性は保たない**。旧データは破棄する。

## 技術スタック

- Next.js (App Router) + React + TypeScript
- Three.js + @react-three/fiber + @react-three/drei
- earcut（三角形化）
- 補間は自前実装（現行の buildInterpolator 系を流用）

## Phase 1 実装詳細

このセクションは Phase 1 を着手可能な具体度まで落とした仕様。数式・規約はすべてここで固定する。やってみて破綻したら変える前提の「一次仮決定」を含む（◆ マークで示す）。

### 座標規約

three.js 標準に揃える。

- **Y 軸**: world の上方向。キャラの頭頂方向
- **Z 軸**: キャラの前方向。正面を向く顔の forward = +Z
- **X 軸**: キャラの右方向（キャラ自身から見た右）
- **原点**: 頭の中心。具体的には HeadParams から生成される楕円体の中心
- **単位**: 抽象的な「世界単位」。Phase 1 では 1 単位 ≒ 顔の縦半分の目安（旧 spec と同じ）

### 頭メッシュ生成式（Phase 1: 楕円体ベース）

HeadParams から頂点配列を生成する関数の具体的手順。

#### 入力

```ts
interface HeadParams {
  width: number;
  height: number;
  depth: number;
  jawNarrowing: number;  // [0, 1]
  jawAngle: number;      // degrees
  topNarrowing?: number; // default 0
  segmentsU?: number;    // default 32 (経度方向)
  segmentsV?: number;    // default 24 (緯度方向)
}
```

#### デフォルト

- `jawNarrowing`: 0.3（顎がやや細くなる）
- `jawAngle`: 0（顎先は楕円のまま）
- `topNarrowing`: 0
- `segmentsU`: 32
- `segmentsV`: 24
- `width / height / depth`: 0.3 / 0.4 / 0.35

#### 生成アルゴリズム

球面パラメータ `(u, v)` を `segmentsU × segmentsV` で離散化（`u ∈ [0, 2π)`、`v ∈ [0, π]`、`v=0` が頭頂、`v=π` が顎先）。各グリッド点で:

1. **基本楕円体座標**
   ```
   x0 = sin(v) * sin(u) * width
   y0 = cos(v) * height
   z0 = sin(v) * cos(u) * depth
   ```

2. **顎テーパー**（下半分 `y0 < 0`）: 下に行くほど XZ 平面で幅を縮める
   ```
   t = min(1, -y0 / height)   // 0=赤道、1=顎先
   narrow = 1 - jawNarrowing * t
   x1 = x0 * narrow
   z1 = z0 * narrow
   ```

3. **jawAngle**: 正面から見た顎先の尖り。`y0 < 0` の範囲で z を前に押し出す。
   ```
   forwardPush = t² * tan(jawAngle) * height
   z2 = z1 + forwardPush
   ```
   ◆ 式は簡易版。顎の「シャクれ」の再現精度は Phase 1 では問わない。

4. **topNarrowing**（頭頂、`y0 > 0`）: 同様に上半分で XZ を縮める（未使用ならスキップ）

5. 最終頂点 `(x1, y0, z2)`（y は変更しない）

#### 頂点・インデックスの順序

- 頂点順序: `i = v * segmentsU + u`（緯度→経度の順に並べる）
- 三角形インデックス: 一般的な球の展開（2 三角形/quad）。CCW で正面が外を向くように
- 極点（`v=0`, `v=segmentsV`）は退化三角形 or 極点周りを三角形ファンで処理

#### 法線

- **解析法線**: 上記の座標式を `u, v` で偏微分して外積から算出。歪みは ResultMesh の法線として書き込む
- 簡単のため Phase 1 は **頂点法線 = 正規化した (頂点 - 中心)** でも可 ◆（楕円体だと厳密には違うが、顎テーパーの小さい歪みは見ため問題になりにくい）

### anchor → 表面点・法線算出

`PartPlacement.anchor` は **正規化された方向ベクトル**。頭中心 (原点) からその方向にレイを飛ばし、頭メッシュ表面との交点を「基準点」とする。

#### Phase 1 の実装: 解析的な楕円体交差

頭メッシュが「楕円体 + 顎テーパー」の小変形である前提で、**基底楕円体との交差のみで基準点を算出** する。顎テーパーによるズレは Phase 1 では無視する ◆。

```
anchor = (ax, ay, az)  // 単位ベクトル
t² * (ax²/w² + ay²/h² + az²/d²) = 1
t = 1 / sqrt(ax²/w² + ay²/h² + az²/d²)
surfacePoint = anchor * t
```

ここで `w, h, d` は `HeadParams.width/height/depth`。

法線は上記の通り `normalize(surfacePoint / (w², h², d²))`（楕円体の勾配）。顎テーパーの影響は Phase 1 では無視 ◆。

◆ 将来拡張: メッシュと anchor のレイキャストにして厳密化。

### 接平面座標系（tangent / bitangent の決め方）

板ポリの「上下」を安定させるため、各表面点で接平面の 2 軸を以下の規約で固定する。

```
normal    = 表面法線（上記で算出）
worldUp   = (0, 1, 0)  // 世界の上方向
bitangent = normalize(worldUp - normal * dot(worldUp, normal))
            // worldUp を法線直交平面に射影
tangent   = normalize(cross(bitangent, normal))
```

意味:
- **bitangent**: 顔面上の「上方向」。顔の縦軸
- **tangent**: 顔面上の「右方向」。顔の横軸
- **normal**: 顔面から外向き

特異ケース: 法線が world up に平行（頭頂 / 顎先に張り付く板ポリ）のとき `bitangent` がゼロになる。このとき fallback として `worldForward = (0, 0, 1)` を射影に使う ◆（頭頂パーツは実用上ほぼないので問題ない）。

### PartPlacement のオフセット適用

```ts
interface PartPlacement {
  anchor: Vec3;
  offsetNormal: number;
  offsetTangent: Vec2;     // [tangent方向, bitangent方向]
  rotationOffset: Vec3;    // [pitch, yaw, roll] in degrees, 順に適用
}
```

#### 基準位置

```
basePosition = surfacePoint
             + normal    * offsetNormal
             + tangent   * offsetTangent[0]
             + bitangent * offsetTangent[1]
```

#### 基準向き（クォータニオン）

接平面の 3 軸 `(tangent, bitangent, normal)` を列とする回転行列から clickable クォータニオン `qBase` を作る。

`rotationOffset` は **接平面座標系で、pitch (tangent 軸周り) → yaw (bitangent 軸周り) → roll (normal 軸周り) の順** に適用 ◆。

```
qOffset = Q_pitch(rotOff[0]) * Q_yaw(rotOff[1]) * Q_roll(rotOff[2])
qPlacement = qBase * qOffset
```

### 板ポリの 3D 埋め込み

板ポリは 2D ローカル座標 `(x, y)` で形状を持つ。これを 3D に埋め込む規約:

- ローカル `+x` → tangent（世界の右向きに対応）
- ローカル `+y` → bitangent（世界の上向きに対応）
- 板ポリの法線 → normal（カメラ側を向く）

CCW で正面が normal 方向を向くように三角形インデックスを生成（earcut の出力は CCW なのでそのまま使える）。

### KF 補間の合成フロー（最終確定版）

各 Part について、現在の (yaw, pitch) と blendShapeWeights から 3D world 配置と形状を求める手順:

```
// 1. 形状差分の合成
points2D = shape.basePoints
for each blendShape bs in part.blendShapes:
  w = blendShapeWeights[bs.id] ?? 0
  if w == 0: continue
  for i: points2D[i] += bs.deltas[i] * w

// KF 補間して形状差分を加算
kfShape = RBF((yaw,pitch), part.yawPitchKeyframes, mode, key: deltas).flatten
for i: points2D[i] += kfShape[i]

// 2. 位置・向きの差分合成
posDelta = [0,0,0]
oriDelta = identityQuaternion
alpha = part.baseAlpha

for each blendShape bs:
  w = blendShapeWeights[bs.id] ?? 0
  if w == 0: continue
  posDelta += (bs.positionDelta ?? 0) * w
  oriDelta = oriDelta * quatPow(bs.orientationDelta ?? identity, w)   // ◆ 下記参照
  alpha *= (1 + (bs.alphaDelta ?? 0) * w)                              // ◆ 乗算合成

// KF 補間
kfPos = RBF((yaw,pitch), part.yawPitchKeyframes, mode, key: positionDelta)
kfOri = RBFquat((yaw,pitch), part.yawPitchKeyframes, mode, key: orientationDelta)
kfAlpha = RBF((yaw,pitch), part.yawPitchKeyframes, mode, key: alpha)  // feature のみ

posDelta += kfPos
oriDelta = oriDelta * kfOri
alpha *= kfAlpha

// 3. 最終 3D 配置
(basePosition, qPlacement) = PartPlacement の適用結果（上述）
worldPosition    = basePosition + qPlacement.rotate(posDelta)  // posDelta は板ポリローカル座標で解釈
worldOrientation = qPlacement * oriDelta                       // 板ポリローカルで回転を合成

// 4. グループ適用（所属する PartGroup があれば）
if part.groupId:
  (groupPosDelta, groupOriDelta) = RBF でグループ KF 補間
  worldPosition    = applyGroupTransform(worldPosition, groupPosDelta, groupOriDelta)
  worldOrientation = groupOriDelta * worldOrientation
  if not isGroupVisible(group, (yaw,pitch)): skip drawing this part

// 5. 点列を 3D に埋め込み
for each p in points2D:
  local3D = (p.x, p.y, 0)                         // 板ポリローカル
  world3D = worldPosition + worldOrientation.rotate(local3D)
  emit vertex world3D
```

#### orientation の補間（RBFquat）

Phase 1 は **quaternion の各成分を独立に RBF で補間 → 結果を正規化** で実装 ◆。KF 間の向き差が小さい前提なら破綻しない。破綻したら slerp ベースに差し替え。

#### blendShape の orientation 重み付け

quaternion に対する `pow(q, w)` は axis-angle 分解:
```
(axis, angle) = toAxisAngle(q)
qw = fromAxisAngle(axis, angle * w)
```
◆ これも簡便な近似。実用上は deltas が小さければ線形近似でも良い。

### キャラローカル (yaw, pitch) の算出

旧 spec の式を継続採用:

```ts
// キャラの world 姿勢はこの Phase では原点・無回転固定とする ◆
const charPos = new Vector3(0, 0, 0);
const dir = camera.position.clone().sub(charPos).normalize();
// キャラローカル = world そのもの（キャラが無回転なので）
const yaw   = atan2(dir.x, dir.z) * (180 / PI);
const pitch = asin(dir.y) * (180 / PI);
```

◆ 複数キャラ配置の際は Character 単位で world 姿勢を持たせ、その逆回転を dir に掛ける。

### Part.kind の違い

| kind | 用途 | α 制御 | 描画順 |
|---|---|---|---|
| `feature` | 目・口・鼻線・眉・頬紅・ハイライト・瞼・まつ毛 | あり (baseAlpha × kf × blend) | layerIndex 準拠 |
| `outline-decoration` | 横顔の誇張輪郭など、頭シルエットを拡張するパーツ | Phase 1 ではナシ（α=baseAlpha 固定扱い） | layerIndex 準拠 |

Phase 1 ではパイプラインは実質同じで、**α の合成式だけが違う** ◆。将来的に outline-decoration 専用の処理（頭メッシュとの union など）を足す余地を残す。

### α の意味の固定

- `Part.baseAlpha`: 絶対値 [0, 1]
- `PartKeyframe.alpha`: **絶対値** [0, 1]。KF 時点でのその角度での α
- `PartBlendShape.alphaDelta`: **差分** [-1, 1]。重みを掛けた値を 1 に足して乗算

最終 α:
```
alphaBlend = 1 + Σ (bs.alphaDelta * weight)   // clamp [0, 1]
alphaKF    = RBF((yaw,pitch), kfs, key: alpha) // 絶対値
alpha      = clamp01(baseAlpha * alphaKF * alphaBlend)
```

この式は旧 spec と整合。

### `fillEnabled` の存在理由

α=0 との違い:
- `fillEnabled = false`: 塗りを完全に描画しない。ストロークは残す
- `fillEnabled = true, baseAlpha = 0`: 塗りの vertex は出力されるが透明

アニメ調で「線だけパーツ」を簡潔に表現する用途 ◆（旧 spec から継承）。Phase 1 では必須ではない。

### 描画パス

1. 頭メッシュを描画（MeshBasicMaterial、深度書き込み ON）
2. 全パーツを depth test あり、depth write は:
   - `feature` かつ `alpha < 1`: depth write OFF（半透明）
   - それ以外: depth write ON
3. 同一パーツ内では `layerIndex` を法線方向の微小 Z オフセット（例: `1e-3`）として使用 → Z-fighting 回避
4. パーツ同士の前後は深度バッファが自動解決（layerIndex でのソートは**不要**）

◆ 半透明ソートが必要になったら Three.js のデフォルト（カメラ距離ベース）に任せる。

### 編集 UI（最小構成の確定）

左ペインに以下を追加・置換:

1. **頭パラメータ編集**
   - width / height / depth / jawNarrowing / jawAngle / topNarrowing の数値入力
   - リアルタイム反映（変更時にメッシュ再生成）
2. **パーツツリー**（既存の PolygonTree を Part 対応に改名・書き換え）
   - 追加ボタン: 「+ feature」「+ outline-decoration」
   - 各 Part の選択・名前編集・削除
3. **Part 属性編集**（選択時）
   - placement.anchor: 3 つの数値入力（x, y, z）+ 「正規化」ボタン
     - ◆ 3D ピッカー（頭メッシュ上クリックで anchor を拾う）は Phase 2
   - offsetNormal / offsetTangent[0] / offsetTangent[1]: 数値入力
   - rotationOffset の pitch / yaw / roll: 数値入力（degrees）
   - fillColor / baseAlpha / fillEnabled / strokeColor / strokeWidth
   - kind（feature / outline-decoration）の切替
4. **形状エディタ**（既存 PointEditor を流用）
   - 2D 板ポリ形状を編集。KF 切替時は差分適用後の形状を表示
5. **KF 一覧・編集**
   - 既存 UI を踏襲。追加で positionDelta (x,y,z) と orientationDelta (pitch,yaw,roll) を数値入力
   - orientationDelta の内部表現は quaternion だが UI は degrees 3 軸
6. **ブレンドシェイプ一覧・編集**
   - 既存 UI + positionDelta / orientationDelta / alphaDelta の入力
7. **グループ**（既存の FeatureGroup UI を PartGroup に改名）
   - visibility rect、KF 一覧、追加/削除
   - layerIndexKeyframes 関連は削除

### 着手順（推奨）

1. **types.ts を書き直す**。新データ構造のみに置き換え
2. **頭メッシュ生成関数** (`_lib/headMesh.ts`) を書く。THREE.BufferGeometry を返す
3. **anchor → 表面点/法線/接平面** のユーティリティ (`_lib/placement.ts`)
4. **補間経路の再構築** (`applyBlendShapes` → `interpolatePart` → `buildGeometry`)
5. **Scene.tsx を Billboard 非使用に書き換え**（透視カメラ + OrbitControls はそのまま）
6. **編集 UI を最小構成まで戻す**（ModelingTool 全体を整理しながら新スキーマ対応）
7. **手動テスト**: 頭パラメータを動かす、パーツを 1 つ置いて角度を変える、KF で位置・向きを変える

Phase 1 完了時の動作目標:
- 頭メッシュが生成されて表示される
- 1 つの Part（例: 鼻の板ポリ）が頭の前面に配置される
- (yaw, pitch) を動かすと anchor 基準の位置が自動で画面内で動く（頭と一体に回る）
- KF を複数置くと補間で形状・位置・向きが変わる
- カメラロールを OrbitControls で試してもパーツが頭と一体に回る（不連続なし）

## 未決事項（実装しながら詰める）

- 頭メッシュの輪郭線の実装方式（Phase 2 以降）
- 「2Dの嘘」の限界点（やってみないとわからない）
- 向き補間の数値的安定性（Euler/quaternion/delta 加算、どれが安定か）
- パーツ板ポリの描画順（深度バッファだけで足りるか、追加ソートが必要か）
- ブレンドシェイプの 3D 差分の UI
- 旧 `OutlineShadowPolygon`（輪郭影）相当の機能の扱い
- 旧 spec の `mirrorSymmetric`（左右対称編集）機能の移植方針
- 旧 spec の `sharpness`（制御点ごとの Catmull-Rom 尖り）の移植方針
- jsonIO の実装（新スキーマ）

## 仮決定のまとめ（実装時に再検討の余地あり）

Phase 1 実装詳細セクション内で ◆ マークを付けた項目:

- 顎テーパーの式は簡易版、再現精度は Phase 1 では問わない
- anchor からの表面点算出は基底楕円体との解析交差のみ（顎テーパーのズレ無視）
- 頂点法線は `normalize(vertex - center)` 近似でも可
- 頭頂/顎先に張り付く板ポリ用の bitangent フォールバックは worldForward
- rotationOffset の適用順は pitch → yaw → roll
- orientation 補間は quaternion 各成分 RBF + 正規化（破綻したら slerp）
- blendShape の orientation 重み付けは axis-angle pow
- α の alphaDelta は 1 に足して乗算
- outline-decoration は Phase 1 では feature とパイプライン同一、α だけ違う
- fillEnabled は旧 spec から継承、Phase 1 では必須ではない
- キャラ world 姿勢は原点・無回転固定
- 半透明ソートは Three.js デフォルトに任せる
- 3D ピッカー（頭メッシュクリックで anchor 取得）は Phase 2
