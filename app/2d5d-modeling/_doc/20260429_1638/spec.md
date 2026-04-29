# 2D顔 × 3Dボディ アニメ表現ツール - 企画書（制御メッシュ + Catmull-Clark 版）

このドキュメントは現行 spec ([20260421_0108/spec.md](../20260421_0108/spec.md)) の後継。旧 spec は保存用に残す。

## 旧 spec との差分

| 観点 | 旧 (3D 配置 / 楕円体ベース) | 新 (制御メッシュ + Catmull-Clark) |
|---|---|---|
| 頭メッシュ | パラメトリック楕円体 + 顎テーパー | 3D 制御頂点 + エッジ + 四角形面のケージを Catmull-Clark で細分化 |
| 鼻・唇 | パーツ板ポリ or 輪郭演出板ポリ | **頭メッシュに造形として含める**（該当制御頂点を前に押し出す） |
| パーツ板ポリ | 目・鼻・口・眉・まつ毛・頬紅・輪郭演出 | 目・眉・まつ毛・頬紅・口の塗り等の **平面装飾のみ** |
| anchor 表面点算出 | 楕円体との解析交差 | 細分化済み高精細メッシュへのレイキャスト |
| 既存データ | — | **破棄。互換性なし** |

KF・パーツ配置のしくみ（anchor + 接平面オフセット、(yaw, pitch) RBF 補間、形状/位置/向き/α 差分）は **旧 spec から継承**。

## 基本方針

### 頭メッシュ（制御メッシュ + Catmull-Clark）

頭の 3D 形状を **低解像度の制御メッシュ（ケージ）から Catmull-Clark 細分化で生成** する。

- 制御メッシュ = 3D 制御頂点 + エッジ + 四角形主体の面（n-gon は許容するが推奨しない）
- 細分化は **反復 2 回固定**（後で調整可能）
- 鼻・唇・頬・額などの造形は、**該当する制御頂点を 3D 空間で動かす** ことで表現
- 結果として **顔・鼻・唇は頭メッシュに含まれる**。旧 spec のようにパーツ板ポリで鼻・唇を作ることはしない

#### プリセット初期ケージ

新規作成時は、左右対称な顔型のケージを初期値として与える。具体的には:

- 縦 6 段（頭頂・額・目元・鼻先・口元・顎）× 横 8 周 ≒ 48 頂点
- + 鼻先・唇周辺に追加頂点を数個
- 全体は四角形主体のトポロジ。Catmull-Clark の本領である quad 主体を保つ

ユーザーは初期ケージから頂点を動かして好みの顔を作る。Phase 1 ではトポロジ編集（頂点追加・エッジ分割）は **未対応**。Phase 2 以降で対応。

#### 左右対称編集（ペア方式）

- 全頂点を保持。対称な頂点ペアは `mirrorPairId` で結ばれ、片方を動かすと相方も X 軸鏡像で連動
- 中央線（X=0 平面上）の頂点は `onMidplane: true` フラグを持ち、X 座標が 0 に固定される
- 一時的に対称を崩したい場合は将来的に「ペア解除」操作を足す余地を残す（Phase 2+）

### パーツ板ポリ（旧 spec 継承、用途を平面装飾に純化）

目・眉・まつ毛・頬紅・口の塗り・ハイライト等は、**3D 空間に位置と向きを持って配置された 2D 板ポリ**。旧 spec の構造をそのまま継承する。

- 鼻・唇・輪郭演出系のパーツは **廃止**（頭メッシュ側に移行）
- `kind` は `feature` のみ残す。`outline-decoration` は廃止
- `anchor` は頭中心からの方向ベクトル。**細分化済み高精細メッシュへのレイキャスト** で表面点・法線を取得

### KF / ブレンドシェイプ（旧 spec 継承）

旧 spec の Phase 1 実装詳細をそのまま継承:

- (yaw, pitch) 2D RBF / Linear-Delaunay 補間
- KF が持つ値: 形状差分 (Vec2[]) + 位置差分 (Vec3) + 向き差分 (quaternion) + α
- ブレンドシェイプも同様に形状/位置/向き/α 差分を持つ
- カメラロールは KF に含めず、3D 透視投影が自然に処理

### カメラロールの扱い

旧 spec と同じ。3D 透視投影が自然処理する。Billboard 廃止のまま。

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

### 頭メッシュ（制御メッシュ）

```ts
interface ControlVertex {
  id: string;
  position: Vec3;
  // ペア方式の対称管理
  mirrorPairId?: string;   // X 軸鏡像の相方の id（中央線頂点には付かない）
  onMidplane: boolean;     // true なら X=0 に固定
}

interface ControlFace {
  id: string;
  // 頂点 id 列。CCW で外向き法線。四角形（4 頂点）が基本。n-gon も技術的には許容
  vertexIds: string[];
}

interface ControlMesh {
  vertices: ControlVertex[];
  faces: ControlFace[];
  // エッジは faces から導出可能なので明示的には持たない
  // （クリース等を導入する Phase 2 で持つ可能性あり）
}

interface HeadModel {
  controlMesh: ControlMesh;
  subdivisionLevel: number;  // 反復回数。デフォルト 2、上限 4 程度
}
```

将来拡張余地:
- `ControlEdge` を明示的に持ってクリース重みを付与
- 頂点ごとのスムージングウェイト

### パーツ板ポリ（旧 spec 継承、用途を絞る）

```ts
interface PartPlacement {
  anchor: Vec3;             // 頭中心から見た方向ベクトル（正規化）
  offsetNormal: number;
  offsetTangent: Vec2;
  rotationOffset: Vec3;     // [pitch, yaw, roll] degrees
}

interface PartShape {
  basePoints: Vec2[];
  layerIndex: number;
}

interface PartKeyframe {
  angle: YawPitch;
  deltas: Vec2[];
  positionDelta: Vec3;
  orientationDelta: Quaternion;
  alpha: number;
}

interface PartBlendShape {
  id: string;
  deltas: Vec2[];
  positionDelta?: Vec3;
  orientationDelta?: Quaternion;
  alphaDelta?: number;
}

interface Part {
  id: string;
  name: string;

  // 旧 spec の "outline-decoration" は廃止。"feature" のみ
  // kind フィールド自体を当面省略。将来別 kind が必要になったら戻す

  placement: PartPlacement;
  shape: PartShape;

  fillColor: ColorRGBA;
  fillEnabled: boolean;
  strokeColor: ColorRGBA | null;
  strokeWidth: number;

  baseAlpha: number;

  yawPitchKeyframes: PartKeyframe[];
  blendShapes: PartBlendShape[];

  groupId?: string;
}
```

### グループ（旧 spec 継承）

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
  visibility: {
    yawRange: [number, number];
    pitchRange: [number, number];
  };
}
```

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
}
```

## 処理フロー

```
頭メッシュ生成:
  1. controlMesh の頂点・面から Catmull-Clark を subdivisionLevel 回反復
  2. 結果の高精細 BufferGeometry を MeshBasicMaterial で描画

パーツ板ポリ:
  1. ブレンドシェイプ適用（形状・位置・向き・α）
  2. (yaw, pitch) KF を RBF で補間
  3. placement.anchor から頭メッシュ表面の基準点・法線をレイキャストで算出
     - 細分化済み高精細メッシュをターゲットに three.js Raycaster
     - 原点（頭中心）から anchor 方向にレイ → 最近交差点
  4. 接平面 (tangent / bitangent / normal) を確立、PartPlacement のオフセット適用
  5. 形状点列 → Catmull-Rom 細分割 → earcut → 板ポリ BufferGeometry
  6. 板ポリを 3D 配置に置く

描画:
  通常の 3D 透視カメラ + OrbitControls
  深度バッファが前後関係を解決
```

## レンダリング層の設計

旧 spec とほぼ同じ。

### Phase 1
- **頭メッシュ**: Catmull-Clark 細分化の結果を MeshBasicMaterial で塗る。陰影・輪郭線なし
- **パーツ板ポリ**: Part 単位で BufferGeometry。`baseAlpha × kf.alpha × blend.alpha` で透明度制御
- **前後整合**: 深度バッファ。同一パーツ内では `layerIndex × ZSTEP` を法線方向に与えて Z-fighting 回避
- **カメラ**: 透視投影 + OrbitControls

### Phase 2 以降
- トゥーン風輪郭線
- トゥーン陰影
- 制御メッシュのトポロジ編集（頂点追加・エッジ分割・ペア解除）
- 前髪 3D メッシュ

## 編集 UI（Phase 1）

### 頭メッシュ編集

- **3D ビューポート内で制御頂点を選択・移動**
  - クリックで頂点選択（複数選択も可）
  - @react-three/drei の `TransformControls` でギズモ移動
  - 数値入力でも移動可能（x/y/z 各成分）
- **左右対称編集**
  - 既定で対称ロック ON。`mirrorPairId` を持つ頂点は連動
  - 中央線頂点（`onMidplane`）は X=0 に固定（X 軸方向のドラッグを無視 or 自動的に 0 に丸める）
- **細分化レベル切替**
  - `subdivisionLevel` の数値入力（0〜4）。リアルタイム反映
- **制御メッシュの可視化**
  - ワイヤーフレーム表示の ON/OFF
  - 頂点を小球で表示し、選択中はハイライト
- Phase 1 では **頂点追加・エッジ分割等のトポロジ編集は未対応**

### パーツ編集（旧 spec 継承）

- パーツツリー（追加・削除・選択・名前編集）
- Part 属性編集
  - placement.anchor: 数値入力 + 「正規化」ボタン
  - offsetNormal / offsetTangent / rotationOffset
  - fillColor / baseAlpha / fillEnabled / strokeColor / strokeWidth
- 形状エディタ（既存 PointEditor 流用）
- KF 一覧・編集（位置差分・向き差分の入力欄含む）
- ブレンドシェイプ一覧・編集
- グループ編集

### カメラ操作

OrbitControls。ロール操作は不要（3D が処理する）。

## Phase 1 実装詳細

### 座標規約

- Y 軸: world の上方向。頭頂方向
- Z 軸: キャラの前方向（forward = +Z）
- X 軸: キャラの右方向
- 原点: 頭の中心
- 単位: 抽象的な世界単位（1 単位 ≒ 顔の縦半分の目安）

### 制御メッシュのプリセット

新規作成時の初期ケージ:

- 縦 6 段（高さ Y で記述）:
  - 頭頂 (Y ≒ +0.4)
  - 額 (Y ≒ +0.25)
  - 目元 (Y ≒ +0.05)
  - 鼻先 (Y ≒ -0.05)
  - 口元 (Y ≒ -0.2)
  - 顎 (Y ≒ -0.4)
- 横 8 周（角度 θ で記述、Y 軸周り）: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
  - θ=0° = 正面 (+Z)、θ=90° = 右（+X）、θ=180° = 背面、θ=270° = 左（-X）
- 各段の半径は楕円体を参考に決定（width 0.3 × depth 0.35 程度）
- 鼻先（鼻先段の正面 0°）: Z を +0.05 程度押し出してから初期値とする
- 唇（口元段の正面 0° 付近）: わずかに Z を押し出す
- 中央線頂点（θ=0° と θ=180°）は `onMidplane: true`、X=0 固定
- それ以外は左右で `mirrorPairId` を持つ
- 面: 隣接する縦 2 段 × 横 2 周で四角形面を構成（縦 5 × 横 8 = 40 quad）
- 頭頂・顎の極は単一頂点に向かう三角形ファン or 四角形を退化させた quad
  - **Phase 1 は退化 quad を許容**（Catmull-Clark は退化 quad を扱える実装が普通）

頂点総数は 40 + 鼻先・唇追加 ≒ 48 前後。実装時に調整。

### Catmull-Clark 細分化

#### 入力
四角形主体（n-gon 許容）の制御メッシュ `(vertices, faces)`。

#### 1 反復の手順（標準アルゴリズム）

1. **face point** を各面に対して計算: 面の頂点の重心
2. **edge point** を各エッジに対して計算: エッジ両端 2 頂点 + 隣接 2 面の face point の平均
   - 境界エッジ（隣接面が 1 つしかない場合）は両端 2 頂点の中点
3. **新しい頂点位置** を各元頂点に対して計算:
   ```
   F = 隣接 face points の平均
   R = 隣接エッジ midpoint の平均
   n = 隣接面数
   newPos = (F + 2R + (n-3)P) / n
   ```
   ここで `P` は元の頂点位置。
4. **新しい面** を作成: 元の各面（n-gon）を、`face point` を中心に、各 `edge point` と元頂点を頂点とする n 個の四角形に分割

これを `subdivisionLevel` 回繰り返す。

#### 実装方針

- 自前実装する。Three.js には Catmull-Clark の実装はない（`SubdivisionModifier` は古い examples で削除済み）
- ライブラリ候補:
  - `@thi.ng/geom-subdiv-curve` 系（要検討）
  - 自前実装が現実的（標準アルゴリズムで 200 行程度）
- **Phase 1 は自前実装** ◆。性能問題が出たら最適化 / WASM 化を検討
- 入力ケージが小さい（〜50 頂点）+ 反復 2 回 = 結果頂点数 ≒ 数千。リアルタイム編集に十分

#### 法線

- 細分化結果の各頂点について、隣接面の面法線の平均で頂点法線を算出
- Phase 1 はこれで十分。スムージングが足りなければ角度ベース閾値を入れる ◆

### anchor → 表面点・法線算出

旧 spec の楕円体解析交差は不可。新方式:

```
1. 頭中心（原点）から anchor 方向に three.js Raycaster でレイを飛ばす
2. ターゲットは細分化済みの高精細メッシュ（BufferGeometry）
3. 最近交差点を surfacePoint とする
4. 法線は交差面の頂点法線を補間（barycentric） or 面法線
```

実装上の注意:
- 細分化結果のメッシュは編集中に頻繁に変わる → Raycaster のターゲット更新が必要
- メモ化キャッシュ: 制御メッシュの hash と subdivisionLevel が変わらない限り再生成しない
- パーツ追加時のみレイキャストして基準点を取れば、その後は anchor 値を保持して再利用してもよい
  - ただし制御メッシュが編集されると基準点も動く。**毎フレームのレイキャストが必要** ◆
  - 性能問題なら BVH 構築（`three-mesh-bvh`）を検討

### 接平面座標系

旧 spec と同じ:

```
normal    = 表面法線
worldUp   = (0, 1, 0)
bitangent = normalize(worldUp - normal * dot(worldUp, normal))
tangent   = normalize(cross(bitangent, normal))
```

特異ケース（頭頂・顎先）の fallback も旧 spec と同じ（worldForward を射影に使う）◆。

### PartPlacement のオフセット適用

旧 spec と完全に同じ。

```
basePosition = surfacePoint
             + normal    * offsetNormal
             + tangent   * offsetTangent[0]
             + bitangent * offsetTangent[1]

qBase     = (tangent, bitangent, normal) を列とする回転行列のクォータニオン
qOffset   = Q_pitch(rotOff[0]) * Q_yaw(rotOff[1]) * Q_roll(rotOff[2])
qPlacement = qBase * qOffset
```

`rotationOffset` の適用順は pitch → yaw → roll ◆。

### 板ポリの 3D 埋め込み

旧 spec と同じ。ローカル `+x` → tangent、ローカル `+y` → bitangent、法線 → normal。

### KF 補間の合成フロー

旧 spec の最終確定版をそのまま継承（形状差分 + 位置差分 + 向き差分 + α、ブレンドシェイプ → KF → グループの順で合成）。

### orientation の補間

quaternion の各成分を独立に RBF で補間 → 結果を正規化。破綻したら slerp ベースに差し替え ◆。

### キャラローカル (yaw, pitch) の算出

旧 spec と同じ。キャラ world 姿勢は原点・無回転固定 ◆。

### 描画パス

旧 spec と同じ:

1. 頭メッシュ（細分化結果）を MeshBasicMaterial で描画。深度書き込み ON
2. 全パーツを depth test あり、depth write は alpha < 1 なら OFF
3. 同一パーツ内では `layerIndex × ZSTEP`（例 1e-3）を法線方向に与えて Z-fighting 回避
4. 半透明ソートは Three.js デフォルトに任せる ◆

### 左右対称編集の実装

#### データ層

- `ControlVertex.mirrorPairId` で対になる頂点を結ぶ
- `ControlVertex.onMidplane` で中央線頂点を識別
- 頂点移動操作は **常にペアと連動**:
  ```
  moveVertex(v, newPos):
    if v.onMidplane:
      v.position = (0, newPos.y, newPos.z)   // X は 0 に丸める
    else:
      v.position = newPos
      if v.mirrorPairId:
        partner = findVertex(v.mirrorPairId)
        partner.position = (-newPos.x, newPos.y, newPos.z)
  ```

#### UI 層

- 対称ロック ON/OFF トグルを Phase 1 でも置く（既定 ON）
- ロック OFF の時はペア連動なし。中央線制約も解除
- 将来「特定の頂点だけペア解除」したいユースケースが出たら、頂点ごとのフラグ追加で対応

### 細分化のリアルタイム性

- 制御メッシュ編集中は頻繁に再計算が走る
- 反復 2 回・ケージ 50 頂点なら、結果メッシュは数百〜千頂点程度。再計算は数 ms で済む見込み
- ただし React 側のリレンダリングを抑えるため:
  - 細分化結果は ref で保持し、`BufferGeometry.attributes` を直接更新
  - メモ化: 制御メッシュ JSON のハッシュをキーにキャッシュ
- パフォーマンス計測してから最適化 ◆

### 編集 UI（最小構成）

1. **頭メッシュ編集ペイン**
   - 制御頂点リスト（id / position）または 3D ビューポート内ピッカー
   - 選択中頂点の x/y/z 数値入力
   - 対称ロック ON/OFF トグル
   - subdivisionLevel スライダ (0〜4)
   - ワイヤーフレーム表示 ON/OFF
   - 制御頂点の小球表示 ON/OFF
2. **パーツツリー** (旧 spec の PolygonTree 相当を Part 用に書き直し)
3. **Part 属性編集**（旧 spec と同じ。kind 切替欄は削除）
4. **形状エディタ**（既存 PointEditor 流用）
5. **KF 一覧・編集**
6. **ブレンドシェイプ一覧・編集**
7. **グループ**（PartGroup）

### 着手順（推奨）

1. **types.ts を書き直す**。新データ構造のみに置き換え
2. **プリセット初期ケージ生成関数** (`_lib/presetHeadCage.ts`)
3. **Catmull-Clark 細分化の実装** (`_lib/catmullClark.ts`)。ControlMesh → BufferGeometry
4. **anchor レイキャスト** (`_lib/placement.ts`)。細分化結果メッシュへのレイキャスト
5. **補間経路の再構築** (旧 spec の applyBlendShapes / interpolatePart / buildGeometry を継承して再構成)
6. **Scene.tsx を新メッシュ生成方式に書き換え**
7. **編集 UI の頭メッシュ編集セクションを実装**（@react-three/drei TransformControls + 数値入力）
8. **左右対称編集ロジック**（頂点移動時のペア連動・中央線制約）
9. **手動テスト**:
   - プリセットケージで頭メッシュが表示される
   - 制御頂点をドラッグして形を変えるとリアルタイム反映
   - 鼻先・唇付近の頂点を動かすと造形が変わる
   - 対称ロックで左右連動する
   - パーツを 1 つ置いて (yaw, pitch) を動かす → 配置が頭メッシュ表面に追従
   - KF を複数置いて補間動作を確認

Phase 1 完了時の動作目標:
- 制御メッシュから細分化された頭メッシュが表示される
- 制御頂点を動かすと頭メッシュがリアルタイムに更新される
- 左右対称編集が動作する
- パーツ板ポリ（目・口など）が頭表面に追従して配置される
- (yaw, pitch) と KF で旧 spec と同等の表情・補間が動く
- カメラロールでも連続性が保たれる

## 未決事項（実装しながら詰める）

- Catmull-Clark 自前実装の正確性検証（既知ケースでの数値比較）
- Raycaster のパフォーマンス（毎フレーム実行で重ければ BVH 化）
- 制御頂点のクリック選択 UX（球の当たり判定サイズ、被り選択時の処理）
- 細分化結果の頂点法線計算の品質（角度閾値の要否）
- 制御メッシュのトポロジ編集（Phase 2）
- クリース（鋭いエッジ）の扱い（Phase 2）
- 旧 `OutlineShadowPolygon` 相当の輪郭影機能の扱い
- 旧 spec の `sharpness`（制御点ごとの Catmull-Rom 尖り）の移植方針
- jsonIO の実装（新スキーマ）

## 仮決定のまとめ（◆）

- Catmull-Clark は自前実装（標準アルゴリズム、200 行程度）
- 細分化反復は 2 回固定（後で調整可能）
- 細分化結果の法線は隣接面平均
- anchor のレイキャストは毎フレーム実行（重ければ BVH 化）
- 接平面・rotationOffset・KF 合成・orientation 補間など旧 spec の仮決定は継承
- 制御メッシュ編集は Phase 1 では頂点移動のみ（トポロジ編集は Phase 2）
- 対称ロックは既定 ON、ロック OFF 時は中央線制約も解除
- 退化 quad（極点）は Catmull-Clark で扱う

## 変更のスコープ

**既存の全コンポーネントを置き換える**。具体的には:

- `_lib/types.ts` — 新データ構造へ
- `_lib/headMesh.ts`（旧楕円体生成） → `_lib/catmullClark.ts` + `_lib/presetHeadCage.ts`
- `_lib/placement.ts` — 楕円体交差からレイキャストへ
- `_lib/applyBlendShapes.ts` / `interpolatePart.ts` / `buildGeometry.ts` — 継承して再構成
- `_lib/jsonIO.ts` — 新スキーマ対応
- `_components/Scene.tsx` / `FaceMesh.tsx` — 新メッシュ生成方式
- `_components/ModelingTool.tsx` — 編集 UI 拡張（頭メッシュ編集セクション追加）
- `_components/PointEditor.tsx` — 流用（2D 形状エディタとして）
- 新規: 制御頂点 3D ピッカー / TransformControls 統合コンポーネント

**既存 JSON データとの互換性は保たない**。旧データは破棄。

## 技術スタック

- Next.js (App Router) + React + TypeScript
- Three.js + @react-three/fiber + @react-three/drei
- earcut（パーツ板ポリの三角形化）
- Catmull-Clark 細分化は自前実装
- 補間は自前実装（既存の buildInterpolator 系を流用）
- @react-three/drei の `TransformControls`（頂点移動ギズモ）
- 必要に応じて `three-mesh-bvh`（レイキャスト高速化）
