# 2D5D Modeling Tool v5 spec — 3D メッシュエディタ（2D 嘘なし）

## 位置づけ

[20260504_1420/retrospective.md](../20260504_1420/retrospective.md) で合意した「**まずエディタ、次に 2D 嘘**」の優先順位に従う。本 spec は **第一段階 = view keyframe / view 軸補間を一切持たない、素直な 3D メッシュエディタ** のみを対象とする。2D 嘘（視点ごとの絵のジャンプ）は本 spec の範囲外。

v4（2D basePoints + 2x3 アフィン + view 軸補間）は構造的に回転中点問題が解消できなかったため全削除。本 spec は新規スタート。

## ゴール

「少ない制御点（数十点規模）で、滑らかな顔の輪郭をメッシュとして編集できる。投影後の 2D 線画 + 塗りで結果を確認できる」状態を作る。

## 完成判定（retrospective.md:236-244 から再掲）

- 少ない制御点（数十点規模）で滑らかな顔の輪郭が作れる
- 線画として綺麗に出る（シルエットエッジ抽出 + 投影後 2D が破綻しない）
- 編集が「絵を描く感覚」に近い（3D ドラッグ + 2D ビュー編集の両方の経路がある）
- 法線・winding 系の不具合がデバッグ可視化で即座に判別できる

これらが満たされた時点で、本 spec は完了。次に 2D 嘘を載せるかは別途検討。

## データ構造

```ts
type Vec3 = [number, number, number];

interface Mesh {
  // 制御点（3D 座標）。インデックスで edges / faces から参照される
  points: Vec3[];
  // 辺は「常に描く線」として明示。シルエット抽出とは独立
  edges: [number, number][];
  // 面は三角形固定（簡潔さ優先）。winding は表向きが反時計回り (CCW)
  faces: [number, number, number][];
}

interface Part {
  id: string;
  name: string;
  groupId: string;          // 所属グループ
  visible: boolean;
  mesh: Mesh;
  // 描画スタイル（投影後 2D で使う）
  strokeColor: string;      // edges + silhouette の色
  fillColor: string;        // 面の塗り色
  strokeWidth: number;      // 線幅 (px)
}

interface Group {
  id: string;
  name: string;
  parentId: string | null;  // null なら root
  visible: boolean;
  // この段階では transform は持たない。座標はすべて world 直書き
}

interface Model {
  version: 5;
  groups: Group[];
  parts: Part[];
}
```

### 設計判断

- **面は三角形固定**: 四角形・n-gon を許すと winding と再投影で複雑になる。投影後の earcut も三角形で受ける方が一貫
- **辺は明示的に持つ**: 「面の境界線をすべて引く」ではなく、ユーザーが「線として残したい辺」を edges に明示。シルエット抽出（後段）は法線符号反転で別途検出
- **グループに transform を持たせない**: 第一段階では world 直書きで OK。階層は所属管理だけに使う。view keyframe 導入時にグループ単位の補間が必要になればその時拡張
- **localStorage キー**: `2d5d-modeling-data-v5`（v4 と非互換）

## レンダリング

### 3D ビュー（編集用）

- `<mesh>` で各 Part の faces を描画（`MeshBasicMaterial` か `MeshStandardMaterial`、シェーディング切替は v4 から流用検討）
- `<lineSegments>` で edges を別レイヤとして描画
- デバッグ可視化（**最初から組み込む**）:
  - **wireframe**: 各 face のエッジを薄く全描画
  - **法線方向の矢印**: 各 face の重心から法線方向に短い矢印
  - **winding 表示**: 表向き面と裏向き面で色を変える（裏面で気付ける）
  - 各表示は ON/OFF トグル

### 投影後 2D 描画（プレビュー用）

- カメラ投影で各 3D 点を NDC → スクリーン 2D に変換
- 線描画:
  - 明示エッジ: `edges` をそのまま 2D 線分で描画
  - シルエットエッジ: 各エッジについて両側の面の `dot(normal, viewDir)` の符号を見て、符号反転 or 片側のみのエッジを描画
- 面描画:
  - 投影後 2D 三角形をそのまま描画（z で前後ソート、または Canvas2D でレイヤ順）
- 実装は r3f Canvas のオーバーレイ（HTML SVG / Canvas2D）か、別の `<Canvas>` か検討。**まずは 3D ビューだけで進めて、2D 投影プレビューは MS2 で着手**

## 編集 UX

### マルチビュー

メイン領域を **4 分割** にする。各ペインで点をドラッグできる：

- **正面 (Front)**: ortho カメラ、xy 編集（z は無視）
- **側面 (Side)**: ortho カメラ、zy 編集（x は無視）
- **上面 (Top)**: ortho カメラ、xz 編集（y は無視）
- **3D 操作 (Perspective)**: OrbitControls で自由視点、TransformControls で 3 軸ドラッグ

各ペインの 1 つを最大化 / 元に戻すボタンを付ける（フォーカスして編集したい時用）。

v4 の上ストリップ（固定 4 視点ミニ）は廃止。MS1 では「全角度で確認」する動機（view keyframe ごとに絵が違うチェック）が無く、メインビューの 3D 操作で十分。MS2 の投影プレビューは「3D 操作」ペインを切替表示するなどで対応する。

「正面でドラッグして xy、側面でドラッグして z」のように **2D ビューでの編集経路を最初から組み込む**ことで、retrospective.md:158 で指摘された「3D 直接ドラッグだけでは深さの把握が難しい」問題を初手から避ける。

### 編集操作

- **点の追加**: 3D ビューでクリック → 既存点の近くに追加 / 既存エッジ上をクリックで分割
- **点の削除**: 選択点を Delete キー
- **点のドラッグ**: 選択点に TransformControls を出して 3 軸ドラッグ
- **辺の追加**: 2 点選択 → "辺を結ぶ" ボタン or キーボードショートカット
- **辺の削除**: 選択辺を Delete キー
- **面の追加**: 3 点選択 → "面を張る" ボタン（winding はクリック順で決まる）
- **面の削除**: 選択面を Delete キー
- **法線反転**: 選択面の頂点順を反転するボタン（winding を直す用）

選択は単一/複数選択どちらも欲しいが、最初は **単一選択** で始め、複数選択は必要に応じて追加。

### 階層

- v4 の PartTree + DnD reparent + ミラー複製 を流用候補。第一段階で必要な機能：
  - グループ追加 / 削除
  - パーツ追加 / 削除（グループに所属）
  - 親子の付け替え（DnD）
  - 表示 / 非表示トグル
- ミラー複製は MS4 で着手（無くても基本動作は確認できる）

### Undo/Redo / 永続化 / JSON I/O

v4 から流用：
- `useHistory` をそのまま使う
- `localStorage` に都度保存、起動時に hydrate
- JSON エクスポート / インポート

## マイルストーン

### MS1: メッシュ編集の基礎

- 1 パーツ・1 メッシュを 3D 空間で点 / 辺 / 面編集できる
- マルチビュー（4 分割: 正面 2D / 側面 2D / 上面 2D / 3D 操作）。各ペインの最大化トグル
- wireframe + 法線可視化 + winding 色分け（各 ON/OFF）
- 単一選択 + 各ペインで点ドラッグ（2D ペインは平面拘束、3D は TransformControls）
- 点追加 / 辺追加 / 面追加 / 各削除
- 確認: 立方体程度の単純な多面体を 4 ペインで組み立てて回せる

### MS2: シルエットエッジ + 2D 線画レンダ

- 投影後 2D で edges を線として描画
- 各エッジの両側の面の前後判定でシルエットエッジを抽出して描画
- 投影プレビューを別パネル / オーバーレイで表示
- 確認: メインビューを回すと、プレビューでシルエットが追従して変わる

### MS3: 塗り

- 投影後 2D で earcut を使って面を塗る（既に三角形なので earcut は使わず三角形そのまま塗りでも可）
- z 前後ソート or 面単位 z-buffer
- 確認: シルエット内が色で埋まる

### MS4: 階層 + Undo/Redo + 永続化

- PartTree（グループ + パーツの階層 UI）
- DnD reparent
- Undo/Redo（useHistory）
- localStorage 永続化 + JSON I/O
- 確認: 複数パーツを組み合わせた状態を再起動後に復元できる

## 流用候補（v4 から）

完成度が高く、第一段階のスコープでそのまま使えそうなもの：

- `useHistory.ts` — 汎用線形履歴
- `Scene.tsx` — r3f Canvas、OrbitControls、ortho カメラ、固定視点モード（ただし「頭メッシュ + パーツ」前提なので骨組みだけ流用）
- `jsonIO.ts` — シリアライズ + tolerant parse + localStorage（version と key を 5 に変える）
- `AnchorGizmo.tsx` — TransformControls の使い方の参考。本 spec では「点ドラッグ」用に作り直し
- `PartTree.tsx` — 階層 UI + DnD。スキーマは違うが UX 構造は流用可

廃止:

- `MultiView.tsx`（上ストリップ + メイン構成は v5 の 4 分割と方向性が違うため作り直し）

廃棄（v4 固有 / 本 spec で不要）:

- `affine.ts`, `viewRbf.ts`, `animRbf.ts`, `catmullRom.ts`, `groupTransform.ts`, `headMeshBuild.ts`, `mirrorGroup.ts`, `outlineMaterial.ts`, `partGeometry.ts`, `shapeTopology.ts`
- `AffineGizmo2D.tsx`, `HeadCurveEditor.tsx`, `HeadMesh.tsx`, `KeyframeList.tsx`, `PartEditor.tsx`, `GroupEditor.tsx`, `Parts.tsx`, `PointEditor.tsx`
- `defaultModel.ts` — v5 用に作り直し
- `types.ts` — v5 用に作り直し

## ディレクトリ構成（予定）

```
app/2d5d-modeling/
  _doc/20260506_1513/spec.md           # 本ファイル
  _components/
    ModelingTool.tsx                    # 全体ハブ
    QuadView.tsx                        # 4 分割レイアウト + 最大化トグル
    Scene.tsx                           # r3f Canvas（v4 から骨組みだけ流用）
    MeshView.tsx                        # 3D メッシュ描画（faces + edges + debug）
    PointGizmo.tsx                      # 選択点の TransformControls（3D ペイン）
    PointDragger2D.tsx                  # 2D ペインでの点ドラッグ（平面拘束）
    PartTree.tsx                        # 階層 UI（v4 から流用）
    PartEditor.tsx                      # 選択パーツのプロパティ編集（色・線幅など）
    Projection2DPreview.tsx             # 投影後 2D 線画 + 塗り（MS2 以降）
  _lib/
    types.ts                            # Mesh / Part / Group / Model
    defaultModel.ts                     # 初期モデル（立方体など）
    jsonIO.ts                           # serialize / parse / localStorage
    useHistory.ts                       # v4 から流用（変更なし）
    meshOps.ts                          # 点追加 / 辺追加 / 面追加 / 削除など
    silhouette.ts                       # シルエットエッジ抽出（MS2）
    project.ts                          # 3D → 2D 投影ヘルパ（MS2）
  page.tsx
  layout.tsx
  getPath.ts
```

## 範囲外（明示）

- view keyframe / view 軸補間（2D 嘘）
- anim keyframe / anim 軸補間
- ホモグラフィ補間（次案 C）
- 機械学習ベース view 補間（次案 D）
- 楕円体・Catmull-Clark 等の頭メッシュ自動生成（パーツとしてメッシュを持てば不要）

これらは第一段階の評価が終わってから検討する。
