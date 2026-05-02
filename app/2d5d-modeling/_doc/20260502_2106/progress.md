# 2D5D Modeling Tool 進捗 (2026-05-02)

## このドキュメントの目的

このセッション (2026-04-30〜2026-05-02、ブランチ `2d5d_modeling`) で完了した作業と、将来の自分・別の会話の Claude が **コンテキストなしで開発を再開できる** ように、現在の状態・残り候補・読むべきファイルを集約する。

## 現状サマリ

**現行 spec**: [20260430_0130/spec.md](../20260430_0130/spec.md) (view-driven 方式)
**Unreal 出力 spec**: [20260502_2106/unreal-export-spec.md](./unreal-export-spec.md)

**実装ステータス**: spec §10 の Phase 1〜4 がほぼ全て実装済み (パフォーマンス最適化と Unreal 側ランタイム実装を除く)。さらに spec §10 候補外の編集 UX も多く追加した。

ツールとして:
- 「2D アニメの嘘を取り込んだ 3D キャラクターモデル」を編集する基盤が一通り揃っている
- 編集体験は **ほぼフル GUI ドラッグ** (頭シルエット 2D / パーツ 2D / anchor 3D ギズモ) で完結
- 全操作が Undo/Redo に乗る (Ctrl+Z / Ctrl+Shift+Z)
- localStorage 自動保存 + JSON 書き出し/読み込み
- マルチビュー (4 視点同時表示) で「全角度で気持ちよい」が編集中に確認できる

## このセッションで作ったもの (commit 順)

1. `23bce4e` view-driven spec 起こし (Catmull-Clark 案を破棄)
2. `c6ae88d` spec §3.5 「なぜ 3D 頭メッシュが必要か」追記
3. `a88c096` 同節に「真上から見た楕円シルエット」具体例追記
4. `84bc64c` Phase 1 実装 (旧 Catmull-Clark 全削除 + 新スキーマ + 頭メッシュ + 単一 view keyframe パーツ)
5. `d53abc3` Phase 2 (view RBF + view keyframe edit + Undo/Redo)
6. `60ef780` Phase 3 (anim keyframe + view × anim 二軸合成 + AnimParamsPanel + AnimKeyframeEditor)
7. `655d832` PointEditor (パーツ shape の 2D ドラッグ)
8. `ce935e8` HeadCurveEditor (頭シルエット 2D ドラッグ)
9. `81b2b28` 階層 PartGroup (parentId + 静的 transformDelta + ツリー UI)
10. `3a84554` Group の view/anim keyframe (transformDelta も補間対象に)
11. `613e407` マルチビュー (固定 4 視点 + メイン)
12. `39a8bc7` shape topology 同期 (点追加/削除を全 keyframe に伝播)
13. `5625cf0` AnchorGizmo (パーツ anchor の 3D ドラッグ)
14. `7f2b8a0` View keyframe → メインカメラスナップ
15. `fd70a34` Unreal 出力フォーマット spec

## ファイル構成

### ドキュメント

```
_doc/
├── 20260411_2231/spec.md       — Billboard 2D 版 (破棄)
├── 20260417_2320/...           — (過去 progress)
├── 20260420_1400/...           — (過去 progress)
├── 20260421_0108/spec.md       — 3D 楕円体配置版 (破棄)
├── 20260429_1638/spec.md       — Catmull-Clark 制御メッシュ版 (破棄)
├── 20260429_1900/progress.md   — Catmull-Clark Phase 1 進捗 (破棄実装)
├── 20260430_0130/spec.md       — ★ 現行 spec (view-driven)
└── 20260502_2106/
    ├── unreal-export-spec.md   — Unreal 連携 JSON フォーマット仕様
    └── progress.md             — このドキュメント
```

### 実装

```
app/2d5d-modeling/
├── page.tsx, layout.tsx, getPath.ts  — Next.js ルート
├── _components/
│   ├── ModelingTool.tsx        — 全状態管理 + サイドバー UI 統括
│   ├── Scene.tsx               — Canvas + interactive/fixed カメラ + snap
│   ├── MultiView.tsx           — 4 ミニビュー + メインビュー
│   ├── HeadMesh.tsx            — 頭メッシュ + 輪郭線描画
│   ├── HeadCurveEditor.tsx     — 頭シルエットの 2D ドラッグ (正面 + 側面)
│   ├── Parts.tsx               — パーツ群描画 (view × anim × group 合成)
│   ├── PointEditor.tsx         — パーツ shape の 2D ドラッグ
│   ├── AnchorGizmo.tsx         — パーツ anchor の 3D ギズモ (drei TransformControls)
│   ├── PartTree.tsx            — パーツ + グループの階層ツリー UI
│   ├── GroupEditor.tsx         — グループ編集 (view/anim keyframe + delta)
│   ├── AnimParamsPanel.tsx     — animParams レジストリ + 現在値スライダー
│   └── AnimKeyframeEditor.tsx  — パーツの anim keyframe 編集
└── _lib/
    ├── types.ts                — 全データ型 (FaceModel v3)
    ├── defaultModel.ts         — 初期状態 + builders
    ├── jsonIO.ts               — シリアライズ + localStorage
    ├── useHistory.ts           — Undo/Redo フック
    ├── catmullRom.ts           — 1D Catmull-Rom 補間
    ├── headMeshBuild.ts        — 頭メッシュ生成 (楕円断面スイープ)
    ├── outlineMaterial.ts      — 輪郭線シェーダ (backface hull)
    ├── placement.ts            — anchor → サーフェス点 + 接平面
    ├── partGeometry.ts         — 2D 形状 → earcut 三角化
    ├── shapeTopology.ts        — shape 点の追加/削除を全 keyframe に伝播
    ├── viewRbf.ts              — 球面距離 + Gaussian RBF 補間
    ├── animRbf.ts              — N 次元 Euclidean + Gaussian RBF + view 合成
    └── groupTransform.ts       — グループチェーン accumulator + group 用 RBF
```

### データモデル (要点)

- **FaceModel v3** ([_lib/types.ts](../../_lib/types.ts))
  - `head: HeadMesh` — Catmull-Rom カーブ (front/side) + 楕円断面スイープのパラメータ
  - `parts: Part[]` — 各パーツに `viewKeyframes[]` + `animKeyframes[]`
  - `groups: PartGroup[]` — 階層 (parentId), 各グループに `viewKeyframes[]` + `animKeyframes[]`
  - `animParams: AnimParamDef[]` — 名前付きパラメータのレジストリ
  - `currentAnimParams: Record<string, number>` — プレビュー用スナップショット
- localStorage key: `2d5d-modeling-data-v3`
- 不変条件: パーツ内の全 view keyframe で shape 点数が一致、anim shapeDelta も同じ長さ (shapeTopology.ts で保証)

## 残り候補 (優先順)

### A. 実用 UX

1. **anim shape delta を PointEditor で編集** — 現状 anim keyframe の shapeDelta は数値入力のみ。「現在の anim 値での見た目」を base + delta で重畳表示しつつ delta をドラッグできるようにすれば、表情の編集が現実的になる
2. **マルチビューの設定可能化** — 角度の追加・編集・保存。複数の代表視点を「アングル本」として保存
3. **パーツ placement の他項目 (offset/rotation/scale) を 3D で編集** — 現状 anchor のみ AnchorGizmo。rotation も Gizmo で掴めると便利
4. **既存 keyframe の paramValues 編集 UI** — 現状 anim keyframe の作成時にスナップショットされて以後変更困難 (フィールドはあるが UI が貧弱)

### B. 正しさ・パフォーマンス

5. **補間結果のメモ化** — 現状カメラ回転中に毎フレーム全パーツの shape geometry を作り直し。view 補間結果が安定 (距離しきい値内) なら再利用
6. **Raycaster の BVH 化** — パーツ数が増えると効く ([three.js BVH library](https://github.com/gkjohnson/three-mesh-bvh))
7. **複数 Canvas での geometry/material 共有** — 現状マルチビュー 5 Canvas でパーツ geometry を独立に作っている。同一 model から派生するので共有可能なはず

### C. Unreal 側

8. **C++/Blueprint 側の実装 spec** — [unreal-export-spec.md](./unreal-export-spec.md) の §5 で挙げた構成要素 (JSON ローダ、頭メッシュビルダ、輪郭線マテリアル、補間ランタイム、anim 供給 IF、座標変換) の Unreal 上の具体設計
9. **カット固有変形層** — spec §2 のレイヤ 3 (頬膨らみ・丸デフォルメ・輪郭変形・物体追加)。Unreal 上の別ツールとして

### D. 拡張データモデル候補

10. **エッジ単位クリース** — 頭メッシュで鋭い線 (顎) を制御点単位 sharpness より細かく
11. **視点固有 anim** — 「正面では blink、横顔では別の表情」のような cross-axis
12. **マテリアル / テクスチャ** — 現状 fillColor + alpha のみ

→ data model 拡張は破壊的変更なので version を 4 に上げる必要あり。

## 再開時に最初に読むべきもの (3 つに絞ると)

1. **[現行 spec](../20260430_0130/spec.md)** — 設計判断・なぜこの方針か。特に §3 (全体方針) と §3.5 (なぜ 3D 頭メッシュが必要か) は必読
2. **[_lib/types.ts](../../_lib/types.ts)** — データモデル全体。FaceModel v3 の構造
3. **[_components/ModelingTool.tsx](../../_components/ModelingTool.tsx)** — 状態管理と全 UI コンポーネントの組み合わせ方が分かる

それ以外は必要に応じて。`_lib/viewRbf.ts` `_lib/animRbf.ts` `_lib/groupTransform.ts` の 3 つは補間ロジックの中心で、Unreal 移植時の参考実装。

## 動作確認の仕方

```bash
pnpm dev
# http://localhost:3000/2d5d-modeling
```

**localStorage を初期化** (デフォルトモデルで始めたい時):
```js
localStorage.removeItem('2d5d-modeling-data-v3')
location.reload()
```

**スキーマ確認用に現在の JSON を覗く**:
```js
JSON.parse(localStorage.getItem('2d5d-modeling-data-v3'))
```

**Hydration mismatch 注意**: SVG 内に `<title>` 要素を入れると SSR/CSR で改行のずれが mismatch を起こす。`role="img"` + `aria-label` で代替する (PointEditor / HeadCurveEditor は既にこのルールに従っている)。

## 既知の不具合・注意点

- **頭メッシュの face winding**: CCW 外向き = `(a0, a1, b1), (a0, b1, b0)` の順序 (a0=row,seg / a1=row,seg+1 / b0=row+1,seg / b1=row+1,seg+1; row は y 昇順、seg は θ 増加で +Z→+X)。逆順は CW で MeshStandardMaterial の FrontSide では裏側だけ描画されてしまう (球状なので外見では気づきにくい)。BackSide hull 輪郭で初めて発覚するので spec/コメントで強調済み (headMeshBuild.ts 内コメント参照)
- **マルチビューで Canvas 5 個 → THREE.Clock deprecation warning が 5 件**: 機能影響なし
- **Playwright 経由のドラッグテストは合成 PointerEvent が React に届きにくい**: TransformControls / PointEditor のドラッグ動作は実機でしか確認できない。状態変化はクリック等の単発イベントで検証可能

## このプロジェクトの「コア哲学」(再開時に忘れないために)

spec §1〜§3 と特に §3.5 を読むのが一番だが、要約:

1. **目的**: 「どの角度から見ても "アニメっぽくいい感じ" に見える疑似 3D キャラクターモデル」を作るツール。3D 整合性より各視点で 2D アニメ的に気持ちよく見える嘘 (横顔で正面側の目が見える / 鼻の見え方が角度で大きく変わる / 横顔で口が顔の横に付く 等) を取り込めることが本質
2. **嘘の入れ場所はパーツ側**: 頭メッシュは「シルエット土台 + パーツ補間の幾何学的座標系」に徹する。立体造形 (鼻の出っ張り等) は頭に含めない (= 3D 制御点の操作が直感的でない問題が再発する)
3. **頭が 3D である理由**: 「2D だけで shape を直線補間すると、視点回転で楕円形シルエットが回転せず潰れる」という根本問題への対処 (Billboard 2D 版で実証済み)
4. **二軸補間**: view (yaw/pitch) と anim (named params) を独立に補間、view 結果に anim delta を加算
5. **3 レイヤ責務分離**: 静止モデル (本ツール) / 共通アニメ (本ツール) / カット固有アニメ (Unreal 側別ツール、再現不可能な嘘の吸収場所)
