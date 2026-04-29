# 2D顔モデリングツール 作業進捗 (2026-04-29)

## 概要

[20260429_1638/spec.md](app/2d5d-modeling/_doc/20260429_1638/spec.md) で定義した「制御メッシュ + Catmull-Clark」方式の **Phase 1** を実装。旧楕円体 + 板ポリ方式は破棄し、JSON 互換性は持たない。

実装の途中で出た見た目の問題（Catmull-Clark 平均化で鼻・顎が丸くなりすぎる、輪郭線がない、メッシュ向き反転、制御点が透けて見える）も同日に解消した。

## 本日のコミット

| SHA | 内容 |
|---|---|
| 858d60b | 制御メッシュ + Catmull-Clark 方式の Phase 1 実装 |
| e0ccdfb | 頂点ごとの sharpness で鼻先・顎先が丸まらないように |
| 6d36720 | 頭メッシュにシルエット輪郭線 |
| 281eb6c | 頭メッシュ裏側の制御頂点・ワイヤを隠蔽 |

## 機能詳細

### Phase 1 全面書き換え

旧 `OutlinePolygon` / `OutlineShadowPolygon` / `FeaturePolygon` ベースの 2D 板ポリ重ね描きを廃止し、頭の 3D 形状を **制御メッシュ + Catmull-Clark 細分化** で生成する方式に置き換えた。

#### データモデル ([_lib/types.ts](app/2d5d-modeling/_lib/types.ts))

- `ControlVertex { id, position: Vec3, mirrorPairId?, onMidplane, sharpness? }`
  - 左右対称はペア方式。中央線（`onMidplane`）は X=0 に固定、それ以外は `mirrorPairId` で対称相方を結ぶ
- `ControlFace { id, vertexIds: string[] }` — CCW で外向き法線。四角形主体（n-gon 許容）
- `ControlMesh { vertices, faces }`
- `HeadModel { controlMesh, subdivisionLevel }` — デフォルト 2、上限 4
- `Part`: 旧 `FeaturePolygon` の後継。`kind` フィールド廃止、形状は 2D の `basePoints: Vec2[]`、`PartPlacement = { anchor: Vec3, offsetNormal, offsetTangent: Vec2, rotationOffset: Vec3 }`、KF の差分は `Vec2[] / Vec3 / Quaternion / alpha`
- `PartGroup`: KF は `positionDelta: Vec3` + `orientationDelta: Quaternion`
- 全体: `FaceModel { head, headFillColor, headOutline, parts, groups, blendShapeWeights, interpolationMode }`

#### プリセット初期ケージ ([_lib/presetHeadCage.ts](app/2d5d-modeling/_lib/presetHeadCage.ts))

縦 5 段（額・目元・鼻先・口元・顎前段）× 横 8 周 + 頭頂・顎の 2 極で計 42 頂点。リング間 quad（5×8 = 40）と頭頂/顎ファン（退化 quad 各 8）でケージを構成。

- 鼻先段の正面頂点は +Z に 0.05 押し出し、唇は 0.02 押し出し
- 中央線（θ=0, π）は `onMidplane: true` で X=0 固定、その他は `mirrorPairId` を持つ
- 鼻先 / 顎先 / 唇には初期 sharpness を seed（後述）

#### Catmull-Clark 自前実装 ([_lib/catmullClark.ts](app/2d5d-modeling/_lib/catmullClark.ts))

標準アルゴリズムをそのまま実装:

1. face point = 面頂点の重心
2. edge point = エッジ両端 + 隣接 2 面の face point の平均（境界エッジは中点）
3. 元頂点の moved 位置 = `(F + 2R + (n-3)P) / n`
4. 各 n-gon を face point を中心に n 個の四角形に分割

退化 quad（極の頂点が重複）は `dedupeFace` で実質三角形として扱う。Phase 1 では反復 2 回固定（UI で 0〜4 切替可能）。

頂点法線は **隣接面法線の重み付き平均**（クロス積を正規化せず大きい三角形の影響を強める）。Phase 2 で角度ベース閾値導入の余地。

#### anchor → 表面点 / 接平面 ([_lib/placement.ts](app/2d5d-modeling/_lib/placement.ts))

旧楕円体の解析交差は破棄。新方式は:

1. 頭中心から `anchor` 方向に three.js Raycaster でレイ
2. 細分化結果メッシュとの最近交差点を `surfacePoint`、面法線を normal として使用（頂点法線補間より安定）
3. 接平面: `bitangent = normalize(worldUp - normal·dot(worldUp,normal))`、`tangent = cross(bitangent, normal)`
4. 頭頂・顎での特異ケースは `worldForward` を射影に使う fallback
5. `rotationOffset = [pitch, yaw, roll]` を pitch → yaw → roll の順に合成、`qBase * qOffset` で最終 orientation

#### 補間パイプライン

- [_lib/applyBlendShapes.ts](app/2d5d-modeling/_lib/applyBlendShapes.ts): blend shape の shape 加算 + position/orientation/alpha 寄与（orientation はクォータニオンを weight 乗）
- [_lib/interpolatePart.ts](app/2d5d-modeling/_lib/interpolatePart.ts): 旧 `interpolateFeature` の後継。形状差分 + position/orientation/alpha 差分を一括で RBF / Linear-Delaunay 補間。orientation は各成分を独立に補間後 normalize（spec 仮決定継承）
- [_lib/partGroup.ts](app/2d5d-modeling/_lib/partGroup.ts): `PartGroup` 用の可視性判定 + transform 補間。旧 `featureGroup.ts` の用途を絞った後継
- [_lib/buildGeometry.ts](app/2d5d-modeling/_lib/buildGeometry.ts): 頭メッシュ BufferGeometry + 各パーツの `PartRenderItem`（local 2D ジオメトリ + 配置 position/quaternion + 描画属性）を返す

#### Scene / FaceMesh

旧 Billboard + OrthographicCamera を廃止し、PerspectiveCamera + OrbitControls + 3D 透視投影に。カメラロールは投影が自然処理する。

- [_components/FaceMesh.tsx](app/2d5d-modeling/_components/FaceMesh.tsx): 頭メッシュ + 各 PartRenderItem を `<group position quaternion>` で 3D 配置
- [_components/ControlMeshOverlay.tsx](app/2d5d-modeling/_components/ControlMeshOverlay.tsx): ワイヤフレーム + 頂点小球（中央線は紫、選択中は青）+ 選択頂点に `@react-three/drei` の `TransformControls` ギズモ

#### 編集 UI ([_components/ModelingTool.tsx](app/2d5d-modeling/_components/ModelingTool.tsx))

Phase 1 用に最小機能で書き直し:

- 頭メッシュ: ワイヤ / 制御点 / 対称ロック / 軸 / グリッド トグル、subdivisionLevel スライダ、頭の色、輪郭線設定、選択頂点の x/y/z 数値入力 + sharpness スライダ
- パーツ: 追加 / 削除 / 名前 / anchor + 正規化 / offsetNormal / 塗り色 / 有効 / baseAlpha / layerIndex
- 補間モード切替
- JSON 書き出し / 読み込み

KF・ブレンドシェイプ・グループ編集 UI、PointEditor 流用は Phase 2 に持ち越し。Undo/Redo も新 UI に再配線していない（旧 `_lib/useHistory.ts` は残置）。

### 頂点ごとの sharpness（クリース簡易版）

Catmull-Clark は反復するたびに頂点を周辺の平均に引き寄せるので、プリセットで鼻先 / 顎先を Z 押し出ししても 2 回反復で丸まりきってしまう問題があった。spec では Phase 2 候補だったクリースを、頂点単位で簡易実装して Phase 1 に前倒し。

`ControlVertex.sharpness?: number` (0..1) を追加し、Catmull-Clark の moved-original 計算を:

```
moved' = lerp(moved, P, sharpness)
```

とブレンド。`sharpness=1` で頂点は完全に固定（infinite-crease vertex 相当）、`0` で標準 Catmull-Clark。新生成 edge / face point の sharpness は 0 で伝播。

プリセットで鼻先 0.7 / 顎先 0.6 / 唇 0.3 を seed。UI に「尖り」スライダ（0..1, step 0.05）を追加し、対称ロック ON 時はペア相方にも同値を反映。

エッジ単位の crease は Phase 2 に残置。

### シルエット輪郭線（backface-hull 法）

`HeadOutline { enabled, color, thickness }` を `FaceModel.headOutline` に追加。同じジオメトリを BackSide で再描画し、シェーダで頂点を法線方向に押し出す方式。

押し出しは **screen 空間** で行う:

1. 頂点を通常通り projection 空間に射影
2. 外向き方向（`normalize(position)`、頭中心が原点なので位置ベクトル自体が外向き）を一度射影し、screen 空間での 2D 方向を得る
3. baseClip.xy にその方向 × thickness × baseClip.w を加算（perspective division 後に screen 空間で一定の太さになる）
4. **z は元のまま** — depth test がフィルメッシュとの前後関係を解決し、シルエット端だけ outline が露出

法線アトリビュートではなく `normalize(position)` を使うのは、Catmull-Clark の極（頭頂・顎）に退化 quad があり頂点法線が壊れるため。位置ベクトル経由なら極でも安定する。

UI に輪郭線 ON/OFF・色・太さ（0〜0.03）を追加。デフォルトは `enabled: true` / 黒 / 太さ 0.005。

### winding 修正

輪郭線を入れて初めて、プリセットケージの face winding が **内向き** になっていたのが発覚。旧 `headMaterial` が `THREE.DoubleSide` だったので外見上は誤魔化せていた。

θ は上から見て時計回り（`x = sin θ × rx`, `z = cos θ × rz`）に増えるので、CCW 外向きの quad は `[r,t+1] → [r,t] → [r+1,t] → [r+1,t+1]` が正しい順序。リング間 quad と頭頂・顎ファンの両方を修正し、`headMaterial` も `THREE.FrontSide` に変更。

### 制御点・ワイヤの depth 隠蔽

ControlMeshOverlay の頂点小球とワイヤフレームは `depthTest: false` で常に手前描画していたため、メッシュの裏側にある制御点が透けて見えて前後が分かりにくかった。`depthTest: false` / `depthWrite: false` を外して通常の depth test に戻した。これでメッシュ向こう側の制御点・ワイヤは隠れる。

### Hydration エラー修正

新 `ModelingTool` の `useState` 初期値で `localStorage.getItem(LS_KEY)` を呼んでいたため、SSR の HTML（保存データなし → デフォルト）と client 初回レンダー（保存データあり）で DOM が食い違い `Hydration failed` 警告が出ていた。

初期値は常に `buildDefaultFaceModel()` にし、`useEffect` でマウント後に localStorage を読み込んで上書きする形に変更。永続化も `useMemo`（誤用）から `useEffect` に移し、`hydrated` フラグでマウント直後の不要な書き戻しを防止。

## 削除したファイル

旧パイプライン由来の依存:

- `_lib/featureGroup.ts` / `interpolateFeature.ts` / `interpolateOutline.ts` / `mat2utils.ts`
- `_components/PolygonTree.tsx` / `GroupGizmo.tsx` / `ReferenceScene.tsx` / `PointEditor.tsx`

`PointEditor.tsx` は将来 2D 形状エディタとして復活予定だが、依存型がほぼ全て変わるため Phase 1 では一旦削除し、Phase 2 で書き直しながら復活させる方針。

## 所感

この方式では輪郭線が制御点を通らないことや三次元上に制御点を置かれることで、スクリーン空間での輪郭を決めることが直感的ではなく難しい。

## 今後の候補（未実装）

- KF 一覧・編集 UI（位置 / 向き / α 差分入力）
- ブレンドシェイプ一覧・編集 UI
- グループ編集 UI（visibility yaw/pitch range、keyframes）
- PointEditor を 2D 形状エディタとして流用復活
- Undo/Redo の新 UI 配線（`_lib/useHistory.ts` は残置）
- 制御メッシュのトポロジ編集（頂点追加・エッジ分割・ペア解除）
- エッジ単位のクリース（鋭いエッジ）
- BVH 化 / 細分化結果のメモ化最適化
- 旧 `OutlineShadowPolygon` 相当の輪郭影機能
- Unreal 移植用 C++ リファレンス実装
