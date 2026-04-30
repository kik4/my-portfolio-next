# 2D5D Modeling Tool 仕様 (2026-04-30)

## 0. この仕様の位置づけ

過去 spec を全て破棄し、書き直す。Phase 1 の Catmull-Clark 制御メッシュ実装 ([_doc/20260429_1638/spec.md](../20260429_1638/spec.md)) が「制御点が三次元上にあって輪郭がスクリーン空間で直感的に決められない」という根本的な問題を抱えており、目標と方向性が合わないと判断したため。

過去 spec（参照のみ、実装は破棄）:
- [20260411_2231/spec.md](../20260411_2231/spec.md) — Billboard 2D版
- [20260421_0108/spec.md](../20260421_0108/spec.md) — 3D楕円体配置版
- [20260429_1638/spec.md](../20260429_1638/spec.md) — 制御メッシュ + Catmull-Clark 版

旧コード（[app/2d5d-modeling/_lib/](../../_lib/) 等）は本 spec 着手時に全削除する。

## 1. 目的

**「どの角度から見ても "アニメっぽくいい感じ" に見える疑似3Dキャラクターモデル」を作成するためのツール。**

「アニメっぽい」とは、3D として立体的に整合した形ではなく、各視点で 2D アニメ的に「気持ちよく見える」嘘を含んだ形を指す。本ツールは、その嘘を視点（カメラ角度）に応じて連続的に変化させる仕組みを提供する。

具体的に取り込みたい嘘の代表例:
- 横顔で正面側の目が見える
- 鼻の見え方が角度で大きく変わる（正面では小さく、横では大きく飛び出す）
- 横顔で口が顔の横に付く（輪郭の外まで動く）

## 2. レイヤ構造（責務分離）

キャラクター表現は3つのレイヤに分離する。本ツールは下2層を担当し、最上層は将来 Unreal Engine 上で別ツールを作る前提とする。

| レイヤ | 役割 | 整合性の範囲 | 担当ツール |
|---|---|---|---|
| 静止モデル | 全角度で "いい感じ" な顔 | 全方位で連続的に成立 | **本ツール** |
| 共通アニメ | 口開き・目の動きなど。全角度で成立する単純なアニメ | 全方位 + 時間軸 | **本ツール** |
| カット固有アニメ | 頬膨らみ・丸デフォルメ・輪郭変形・物体追加 | そのカットのスクリーン空間のみ | Unreal 上の別ツール（将来） |

カット固有レイヤは「再現不可能な嘘を吸収する場所」として明示的に分離する。本ツールは無理にここまで踏み込まない。

静止モデルは「すべての共通アニメパラメータ = 0」の状態と解釈できるため、データ構造上は共通アニメに包含される（静止モデル単体の特別扱いはしない）。

## 3. 全体方針

### 3.1 嘘を入れる場所はパーツ側

頭メッシュ（シルエット土台）はカメラ角度で変形しない。嘘は全てパーツ側で吸収する。

理由:
- 頭メッシュにまで嘘を入れると複雑度が跳ね上がる
- 2D アニメで嘘の主戦場は目・鼻・口・眉などのパーツ。頭の輪郭そのものは比較的安定して見えてよい
- 頭メッシュを単純な「土台」に保つことで、Unreal 移植も容易になる

### 3.2 二軸補間

各パーツは shape / placement を以下の二軸で連続変化させる:

- **view 軸**: カメラ yaw + pitch の 2 次元
- **anim 軸**: ユーザー定義の named parameter（mouthOpen, eyeBlink 等）の N 次元

最終形状は「現在の (yaw, pitch) で view 補間した結果」に「現在の anim パラメータで anim 補間した差分」を合成して得る（詳細は §6）。

### 3.3 編集 UI の中心

編集 UI の中心は「**カメラを回しながら、その視点での絵を直接編集する**」操作。

例: 横顔（yaw=90°）にカメラを向け、目パーツを「横顔でも見える位置」にドラッグ → 自動的に「yaw=90° の view keyframe」として保存される。

これは Phase 1 で「3D 上の制御点を直接掴む」UI が直感的でなかったことへの直接的な回答。

### 3.4 Unreal 移植可能性

ブラウザ固有 API（DOM, Canvas2D など）に依存しない、純粋なデータ + 数学の構造で全ての形状・補間を表現する。最終的に JSON で出力し、Unreal 側でランタイム + エディタ拡張を別途作って受け取る前提。

本 spec では Unreal 連携の具体仕様は規定しない（「移植を阻害しない」までを担保）。

### 3.5 なぜ頭メッシュ（3D 土台）が必要か

頭メッシュは「立体的な見た目を作るため」ではなく、**パーツの view 軸補間における幾何学的な座標系を提供するため** に必要。

過去の Billboard 2D 版で、view keyframe 間の制御点をスクリーン空間の直線で補間する方式を試したが、視点と被写体の幾何学的関係によっては破綻した。

具体例: 頭を真上から見ると頭蓋骨は楕円形（前後に長く左右に狭い）。被写体の頭を yaw 方向に回転させると、スクリーン上でも楕円がそのまま回転して見えるのが直感的に正しい。しかし制御点を view keyframe 間で直線補間する方式だと、各制御点がスクリーン上の直線を移動するだけなので、楕円が「回転せずに縦長から横長に潰れて伸び直す」ような不自然な変形になる。

これは制御点の直線補間が回転を表現できないことに起因する根本問題で、3D 回転を「2D 制御点の直線補間で近似する」アプローチでは解決できない。

3D 頭メッシュを土台に置くと、yaw / pitch は頭メッシュの 3D 回転としてそのまま処理される:
- パーツの anchor は頭メッシュ表面に貼られる
- yaw が動けば anchor は頭の周りを 3D 回転して移動する
- 視点が真上でも斜めでも、anchor は頭の表面という 3D 多様体上を動くので、スクリーン上の見え方が破綻なく出る
- パーツ自体は接平面に貼った 2D 板のままでよい（嘘は接平面内のオフセットや shape 形状で吸収する）

この用途のために頭メッシュは「ただの球」ではなく、**正面/側面/上面シルエットがアニメ的に整った形** である必要がある。anchor が貼られる表面の形がそのまま「パーツが回転して動く軌道」を決めるため。逆に、頭の表面に 3D 的な凹凸（鼻の出っ張り等）まで含める必要はない（むしろ含めると Catmull-Clark 版で発生した「3D 制御点の操作が直感的でない」問題が再発する）。

つまり頭メッシュは「**シルエットだけはちゃんとした、表面に凹凸のない 3D の土台**」というのが本仕様の核心的な設計判断。

## 4. 頭メッシュ（シルエット土台）

### 4.1 役割と方針

- 役割:
  - パーツの anchor が貼られる **3D 多様体としての座標系**（§3.5 参照）
  - 顔のシルエット（外形）を与える色付きの「板」
- カメラ角度では変形しない（一度作ったら全方位同じ）
- 立体的な造形（鼻の出っ張り等）は含めない。鼻はパーツとして別に乗せる
- ただし「シルエットだけはちゃんとした 3D 形状」である必要がある（球では yaw 回転時のパーツ軌道がアニメ的にならない）

### 4.2 表現

正面シルエット・側面シルエットの 2 本の 2D カーブを Catmull-Rom スプラインで描き、それらを楕円断面で回転体的にスイープしてメッシュを生成する。

#### カーブ

- **frontHalfCurve**: 正面視（カメラ yaw=0°）でのシルエットの **右半分**（X ≥ 0）
  - XY 平面上の 2D 制御点列。Y は頭頂から顎へ単調減少
  - 中心線（X=0）の制御点は X が 0 に固定され、それが頂上点（頭頂）と最下点（顎）を表す
  - スプラインは Catmull-Rom（制御点を通過、張力パラメータあり）
  - 左半分は X ミラーで自動生成（左右対称）

- **sideHalfCurve**: 側面視（カメラ yaw=90°）でのシルエットの後ろから前まで一周するうちの **片側半分**
  - ZY 平面上の 2D 制御点列。Y 軸方向に頭頂から顎へ単調減少、Z 軸方向は前後
  - 後頭部側（Z<0）半周のみ持ち、前面側（Z>0）は別の制御点列、または共通の Y で前後の Z を両方持つ形式 — **採用: 共通 Y 列で各 Y の (Z前面, Z後頭部) ペアを持つ**
  - 中心線（Y最大=頭頂、Y最小=顎）では Z前面 = Z後頭部 = 0 に固定（先端の特異点）

頭の左右対称はミラーで保証する。前後非対称（おでこと後頭部）は side カーブで自由に表現できる。

#### Y サンプル共有

frontHalfCurve と sideHalfCurve は **同じ Y サンプル列を共有** する。これにより:
- 頭頂・顎の特異点が両方で揃う
- 各 Y で「前面 Z」「後頭部 Z」「半幅 X」の 3 値が定まり、楕円断面の生成が一意

ユーザーは Y 列（高さの段数）を編集でき、各段で 3 値を独立に設定する。

#### 楕円断面のスイープ

各 Y サンプルで:
- a = frontHalfCurve(Y) の半幅 X
- 前後中心 = (Z前面 + Z後頭部) / 2
- b前面 = Z前面 - 前後中心、b後頭部 = -(Z後頭部 - 前後中心) （正の値）

θ = 0..2π を N 分割し、断面リング上の点を以下で生成:
```
X = a * sin(θ)
Z = 前後中心 + (cos(θ) >= 0 ? b前面 : b後頭部) * cos(θ)
```
（前後で b を切り替える「半楕円接ぎ」）

Y 段間で対応する θ の点を四角形で繋いでメッシュ化。頭頂・顎の特異点は a=b=0 に縮退するファンで閉じる。

メッシュは三角形分割した BufferGeometry として保持。法線は隣接面から計算。

### 4.3 編集 UI

- 正面ビュー: frontHalfCurve（XY 平面、X≥0 半分）の制御点を 2D ドラッグで編集。X=0 制約付きの中心線制御点を含む
- 側面ビュー: sideHalfCurve（ZY 平面）の前面 Z・後頭部 Z を 2D で編集
- Y サンプル数の追加・削除
- Catmull-Rom 張力パラメータ
- 円周分割数 N（描画品質）

頭メッシュには色（fillColor）と輪郭線（outline: enabled, color, thickness）の属性を持たせる。輪郭線は Phase 1 のシルエット輪郭線（backface-hull screen-space 押し出し）方式を流用してよい — ただし実装は今回の頭メッシュトポロジに合わせて新規作成する。

## 5. パーツ

### 5.1 概念

パーツ = 頭メッシュの上に乗る、嘘を担う 2D 板ポリの集合。Phase 1 の `Part` の発想に近いが、本仕様では「view 軸 + anim 軸の二軸補間を持つ」点が中核。

各パーツは:
- ローカル 2D 形状（XY 平面上の閉ポリゴン or 折れ線）
- 配置（anchor で頭表面の位置を指定、その点での接平面に沿って張る）
- 描画属性（塗り色、線色、線太さ、α、layerIndex）
- view keyframes 配列
- anim keyframes 配列

### 5.2 配置（PartPlacement）

各 keyframe で、パーツがどこにどの向きで貼られるかを以下で表現する:

```
PartPlacement = {
  anchor: Vec3              // 頭中心から外向きの単位方向。ここから頭メッシュにレイを撃って表面点を得る
  offsetNormal: number      // 表面から法線方向のオフセット（板を浮かせる）
  offsetTangent: Vec2       // 接平面内のオフセット（surfaceTangent / surfaceBitangent ベース）
  rotationOffset: Vec3      // 接平面に貼った後のローカル pitch/yaw/roll 追加回転
  scale: Vec2               // 接平面内のローカルスケール
}
```

頭中心（origin）から anchor 方向にレイキャストして頭メッシュとの最近交差点を得て、その点の面法線で接平面を作る。tangent / bitangent は worldUp を使った Phase 1 と同じ方式（特異ケースは worldForward fallback）。

「横顔で口が顔の横に付く」ような嘘は、横顔向けの view keyframe で anchor 方向を顔の中心ではなく横向きに設定して実現する。anchor が頭メッシュの表面のどこに出るかは頭メッシュ側のジオメトリで決まるため、結果として口の板は「頭の側面に貼られた」状態になる。

### 5.3 形状

```
PartShape = {
  basePoints: Vec2[]         // ローカル XY 平面上の頂点列（CCW）
  closed: boolean            // 閉じたポリゴンか折れ線か
}
```

Phase 1 と同じ単純な 2D ポリゴン。形状の編集は専用の 2D エディタ（過去の `PointEditor` 相当を新規実装）で行う。

### 5.4 view keyframe

```
ViewKeyframe = {
  yaw: number                // ラジアン or 度。仕様では度を採用
  pitch: number              // 度
  shape: PartShape
  placement: PartPlacement
  visible: boolean           // この yaw/pitch でパーツが見えるか
  alpha: number              // 0..1
}
```

ユーザーは離散的な (yaw, pitch) で keyframe を置く。間は §6 の RBF で補間する。

最低 1 個（= 全方位同じ）あれば動作する。視点で嘘を入れたい場合に追加する。

### 5.5 anim keyframe

```
AnimKeyframe = {
  paramValues: { [paramName: string]: number }  // 各 named parameter の値（疎でよい）
  shapeDelta: Vec2[]         // basePoints と同じ長さ。基準形状への加算差分
  placementDelta: {
    anchorDelta: Vec3
    offsetNormalDelta: number
    offsetTangentDelta: Vec2
    rotationOffsetDelta: Vec3
    scaleDelta: Vec2
  }
  alphaDelta: number
}
```

view keyframe と違い、anim は **差分** として保持する。これにより:
- 「すべての anim パラメータ = 0」が静止状態（view 補間結果そのもの）
- view 補間と anim 補間が独立に合成できる

#### named parameter

paramName はユーザー定義（例: `"mouthOpen"`, `"eyeBlink"`, `"eyeLookYaw"`, `"smile"`）。プロジェクト全体で共通の named parameter のレジストリを `FaceModel.animParams: AnimParamDef[]` として持つ:

```
AnimParamDef = {
  name: string
  range: [number, number]    // 表示・編集 UI のスライダー範囲。補間自体は範囲外も許容
  default: number
}
```

各パーツの anim keyframe は paramValues に必要な param だけ含む（その他は 0 と解釈）。

### 5.6 PartGroup

複数パーツをまとめる。Phase 1 の `PartGroup` を踏襲し、グループ単位で:
- 可視性のオン/オフ
- グループ全体の view keyframe（位置・向きデルタを子に乗せる）

を持つ。実装詳細は実装フェーズで詰める。

## 6. 補間

### 6.1 view 補間（yaw/pitch）

view keyframe を 2 次元（yaw, pitch）の RBF（Radial Basis Function）で補間する。

- 距離: 球面上の角度距離（yaw/pitch を球面座標と解釈し、対応するベクトル間の角度）またはユークリッド距離（yaw/pitch をそのまま 2D 平面座標として扱う）— **採用: 球面角度距離**。yaw が 0 と 360 で同一視される必要があるため
- カーネル: Gaussian (`exp(-(d/σ)^2)`) または thin-plate spline。**採用: Gaussian**。σ は param で調整可
- 補間対象: shape の各頂点、placement の各成分、alpha、visible（visible は最近傍の keyframe を採用、または閾値付き連続化）
- 形状頂点数は全 view keyframe で一致させる（頂点 ID で対応）。ユーザーが一方の keyframe で頂点を増減したら、他の keyframe にも自動反映される（不変トポロジ）

keyframe が 1 個しかない場合はその keyframe をそのまま使う。

### 6.2 anim 補間

anim keyframe は paramValues の N 次元空間での RBF 補間。view と同じく Gaussian。

各パーツの最終 shape / placement は:
```
final = view_interpolated(yaw, pitch) + Σ_k anim_weight_k(currentParams) * anim_keyframe_k.delta
```
（view 結果に anim の重み付き差分を加算）

paramValues に含まれない param は 0 と解釈。currentParams が paramValues と一致する keyframe があれば、その keyframe の差分が weight 1 で寄与する。

### 6.3 visible / alpha の扱い

`visible: boolean` は連続値ではないので、view 補間時は:
- 各 view keyframe を「visible なら 1、不可視なら 0」の連続値として RBF 補間
- 結果が閾値（例: 0.5）以上なら可視、そうでなければ不可視

または、最近傍の keyframe の visible をそのまま採用する単純運用も可（実装で選択）。

alpha は 0..1 の連続値として通常の RBF 補間。

## 7. データモデル（スキーマ）

```ts
type Vec2 = [number, number]
type Vec3 = [number, number, number]

// ============ 頭メッシュ ============
type FrontCurveControl = {
  y: number       // 共通 Y サンプル列のインデックス参照ではなく、Y 値そのものを保持
  halfX: number   // 半幅（X≥0 側）。中心線（頭頂・顎）では 0
}

type SideCurveControl = {
  y: number       // FrontCurve と同じ Y 値を共有
  zFront: number  // 前面 Z（前向き正）
  zBack: number   // 後頭部 Z（後ろ向きは負）
  // 中心線では zFront = zBack = 0
}

type HeadOutline = {
  enabled: boolean
  color: string
  thickness: number
}

type HeadMesh = {
  ySamples: number[]                  // Y 値の昇順または降順配列。frontCurve と sideCurve はこのインデックスで対応
  frontHalfXs: number[]               // ySamples と同じ長さ、各 Y での halfX
  sideZFronts: number[]               // ySamples と同じ長さ、各 Y での zFront
  sideZBacks: number[]                // ySamples と同じ長さ、各 Y での zBack
  catmullRomTension: number           // 0..1、デフォルト 0.5
  ringSegments: number                // 各 Y リングの円周分割数、デフォルト 32
  fillColor: string
  outline: HeadOutline
}

// ============ パーツ ============
type PartShape = {
  basePoints: Vec2[]                  // CCW
  closed: boolean
}

type PartPlacement = {
  anchor: Vec3                        // 頭中心からの方向（正規化推奨）
  offsetNormal: number
  offsetTangent: Vec2
  rotationOffset: Vec3                // [pitch, yaw, roll]、度
  scale: Vec2
}

type ViewKeyframe = {
  id: string
  yaw: number                         // 度
  pitch: number                       // 度
  shape: PartShape
  placement: PartPlacement
  visible: boolean
  alpha: number
}

type AnimKeyframe = {
  id: string
  paramValues: Record<string, number>  // 疎
  shapeDelta: Vec2[]                   // basePoints と同じ長さ
  placementDelta: {
    anchorDelta: Vec3
    offsetNormalDelta: number
    offsetTangentDelta: Vec2
    rotationOffsetDelta: Vec3
    scaleDelta: Vec2
  }
  alphaDelta: number
}

type Part = {
  id: string
  name: string
  groupId?: string
  layerIndex: number
  fillColor: string
  strokeColor: string
  strokeWidth: number
  viewKeyframes: ViewKeyframe[]       // 最低 1 個
  animKeyframes: AnimKeyframe[]       // 0 個以上
  rbfSigmaView: number                // view RBF の σ
  rbfSigmaAnim: number                // anim RBF の σ
}

type PartGroup = {
  id: string
  name: string
  visible: boolean
  // 必要に応じてグループ単位の view/anim keyframe を後から追加
}

// ============ アニメパラメータ定義 ============
type AnimParamDef = {
  name: string
  range: [number, number]
  default: number
}

// ============ 全体 ============
type FaceModel = {
  version: 3                            // スキーマバージョン
  head: HeadMesh
  parts: Part[]
  groups: PartGroup[]
  animParams: AnimParamDef[]
  currentAnimParams: Record<string, number>  // プレビュー用、永続化対象
}
```

スキーマバージョンは 3（Billboard=1, 楕円体=2 と素朴に振る。Catmull-Clark 版は短命だったので別番号は割り当てない）。localStorage key は `"2d5d-modeling-data-v3"`。

## 8. 描画

three.js + @react-three/fiber を使う方針は維持（Unreal 移植時はランタイム書き換え前提なのでブラウザ側は React 流儀でよい）。

### 8.1 シーン構成
- PerspectiveCamera + OrbitControls（Phase 1 と同じ）
- 頭メッシュ: §4.2 で生成した BufferGeometry を MeshStandardMaterial（FrontSide）で描画
- 輪郭線: backface-hull の screen-space 押し出しシェーダ（Phase 1 流用ロジックを新規実装）
- パーツ: 各パーツについて、現在の (yaw, pitch, currentAnimParams) で補間した shape を 2D 三角化して BufferGeometry 化、placement で計算した position + quaternion で `<group>` 配置

### 8.2 編集オーバーレイ
- 頭メッシュ: 正面ビュー / 側面ビュー切替で 2D カーブの制御点を編集（後述）
- パーツ: 選択中パーツの shape を 2D で編集（PointEditor 相当を新規実装）、view keyframe の anchor は 3D 上のギズモで編集

### 8.3 yaw/pitch の取得

現在のカメラ位置から yaw, pitch を逆算してパーツの view 補間に渡す。OrbitControls の azimuth / polar をそのまま使う。

## 9. 編集 UI

### 9.1 主要モード

ツールは以下のモードを持つ。モード切替は単一の 3D ビューに別オーバーレイを乗せる形:

- **Head Edit**: 頭メッシュのカーブ編集
  - サブビュー: 正面（XY）と側面（ZY）の 2D エディタ
- **Part Shape Edit**: 選択中パーツの shape 編集
  - 2D エディタで basePoints をドラッグ
- **Part Placement Edit**: 選択中パーツの placement 編集
  - 3D ビュー上で anchor をギズモで動かす
- **View Keyframe Edit**: カメラを回しながら、その視点でパーツを直接編集
  - **このモードが本ツールの中心**
  - カメラを目的の (yaw, pitch) に向ける → そのカメラ位置に最も近い既存 keyframe を編集対象とする、または新規 keyframe を作成
  - shape も placement もこのモードで直接編集できる
- **Anim Edit**: 名前付きパラメータごとの anim keyframe 編集
  - スライダーで currentAnimParams を動かしてプレビューしつつ keyframe を作成・編集

### 9.2 全方位プレビュー

カメラを自由に回して全方位での見た目を確認できる。複数の代表角度（正面、3/4、横、上斜め等）を小さなサブウィンドウで同時表示する **マルチビュー** を Phase 2 以降で検討（spec ではフックだけ用意）。

### 9.3 永続化

- localStorage（key: `2d5d-modeling-data-v3`）への自動保存
- JSON ファイル書き出し / 読み込み
- 起動時の hydration 安全化: useState 初期値はデフォルトモデル、useEffect でマウント後に localStorage を読み込む（Phase 1 の hydration 修正方針を踏襲）

### 9.4 Undo/Redo

別ファイルとして残置されている [_lib/useHistory.ts](../../_lib/useHistory.ts) は本 spec 着手時に削除し、新 ModelingTool で改めて書き直す。Phase 2 着手時の早い段階で配線する。

## 10. 実装計画

### Phase 1（最小可動）
- データモデル + JSON I/O + localStorage 永続化
- HeadMesh の生成（カーブ編集 UI なし、デフォルトプリセットだけ）
- パーツ追加 / 削除 / shape 編集 / placement 編集（view keyframe 1 個固定）
- 3D プレビュー（OrbitControls で回せる）
- 輪郭線シェーダ

### Phase 2（コア機能）
- HeadMesh のカーブ編集 UI（正面・側面サブビュー）
- View Keyframe Edit モード（カメラ角度連動の編集）
- view RBF 補間
- Undo/Redo

### Phase 3（アニメ対応）
- AnimParamDef レジストリ
- anim keyframe 編集 UI
- anim RBF 補間
- view × anim の合成
- マルチビュー（任意）

### Phase 4（仕上げ）
- PartGroup の view/anim keyframe 対応
- 出力 JSON の Unreal 向けフォーマット定義（別 spec として切り出す）
- パフォーマンス最適化（補間結果のメモ化、形状ジオメトリのキャッシュ等）

## 11. 非対象（本ツールではやらない）

- カット固有のアニメ・変形（Unreal 上の別ツール）
- 体・首・髪（顔のみ）
- ライティング・影・最終レンダリング
- リアルタイム再生用ランタイム（プレビュー用途に留める。Unreal 側で実装）
- リギング（ボーン・ウェイト）

## 12. 用語

- **view 軸**: カメラ yaw + pitch で張られる 2 次元空間
- **anim 軸**: 名前付きアニメパラメータで張られる N 次元空間
- **view keyframe**: view 軸上の特定の (yaw, pitch) におけるパーツの絶対状態
- **anim keyframe**: anim 軸上の特定の paramValues における view 補間結果からの差分
- **シルエット土台**: 頭メッシュのこと。パーツが乗る色付きの板であり、立体造形は持たない
- **嘘**: 3D としては整合しないが、各視点で 2D アニメ的に良く見える形状・配置の差異
