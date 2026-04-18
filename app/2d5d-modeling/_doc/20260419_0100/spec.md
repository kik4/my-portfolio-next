# 首モデルプレビュー仕様 (2026-04-19)

## 背景

この顔モデルは、3D の首から下の身体（別モデル）の上に貼り付く前提で運用する。

正面〜斜め程度の角度では顔モデルを手前に描いていれば破綻しないが、上向き・横向きでは顔モデルと 3D 首の接合部に輪郭線が描かれてしまい不自然になる。

そこで、**接合部の輪郭処理**を最終的に実装するための前段として、まず**簡易な首モデル**をエディタ上にプレビューできるようにする。首モデル自体は UE 側のボーンアニメーションと互換性を持たせる（2ボーン: `neck_01` + `head`）ことで、後の工程（Blender で身体と接続、UE に持ち込み）との整合を取る。

## スコープ

本仕様は **Phase 1: 首モデルのプレビュー表示** のみを対象とする。

Phase 1 では次を行わない:
- 首シルエットによる outline stroke のマスク（Phase 2 以降）
- 首モデルの永続化（JSON 保存／Undo/Redo 対象外）
- UE 向けの首モデルエクスポート（Blender は別途モデリング）
- 顔ポリゴンKFと首姿勢の連動

## 座標系と単位の前提

既存の顔モデルで使われている座標系・スケールに揃える:

- 座標系は three.js 標準（右手系、+Y が上、+Z が視点手前）
- 顔モデルの `basePoints` は概ね ±0.3〜±0.4 程度の範囲（顔の楕円は rx=0.3, ry=0.4 が初期値）
- 「1 単位 ≒ 顔の縦半分」くらいの感覚
- 角度はすべて degrees で持つ（既存の `YawPitch` と合わせる）

## 首モデルの構造

UE Mannequin と同じ 2 ボーン構成に合わせる。

- **下段ボーン** (`neck`, UE での `neck_01` 相当): 肩の上端から伸びる
- **上段ボーン** (`head`, UE での `head` 相当): 下段の上端から伸びる。顔モデルはこの上段の上端に貼り付く想定

各ボーンは「円柱」で近似する。

```ts
interface NeckBone {
  radius: number;    // 円柱半径（単一、テーパーなし）
  height: number;    // 骨の長さ
  rotation: {        // 親骨に対する相対回転（degrees）
    yaw: number;
    pitch: number;
    roll: number;
  };
}

interface NeckModel {
  neck: NeckBone;   // UE: neck_01
  head: NeckBone;   // UE: head
  origin: [number, number, number];  // 肩の上端（neck 下端）のワールド座標
}
```

### 階層構造

- `neck` の原点: `origin`（ワールド座標で固定）
- `neck` の回転: ワールド基準
- `head` の原点: `neck` の上端（= `neck.rotation` を適用した上で `neck.height` 分 neck の軸方向に進んだ位置）
- `head` の回転: `neck` のローカル座標基準（親に対する相対）

### ボーンのローカル軸と回転順序

- 各ボーンの **長さ方向は +Y 軸**。円柱の底面が原点、上端が `(0, height, 0)`（ローカル座標）
- 回転順序: **ZYX オイラー角（UE の FRotator と同じ順）**
  - 適用順は roll (X) → pitch (Y) → yaw (Z) の順に親座標系へ積む
  - three.js で実装する際は `Euler(pitch, yaw, roll, "YXZ")` ではなく、`Object3D.rotation` に各軸を個別セットするのではなく、`Matrix4.makeRotationFromEuler` または `Quaternion` 合成で明示的に順序を固定すること
- 回転適用後、ローカル +Y 方向が実質的な「骨の向き」となる

### ワールド上の顔の向き（参考）

プレビューだけなので計算には使わないが、UE に持ち込んだ時に「顔が最終的にどこを向くか」の式は:

```
顔の向き = neck.rotation × head.rotation
画面上の見かけ = カメラ座標系に変換した上記
```

## データの扱い

**Phase 1 では首モデルは完全にプレビュー専用**。

| 項目 | 扱い |
|---|---|
| `FaceModel` への追加 | しない |
| JSON 入出力 | 対象外 |
| Undo/Redo | 対象外 |
| localStorage 永続化 | 対象外（編集中セッション内でのみ保持）|
| 顔ポリゴン KF との連動 | なし（顔 KF の `(yaw, pitch)` は従来どおりカメラ角度） |
| 顔形状への影響 | なし（首の姿勢は顔の変形に使わない） |

実装上は `ModelingTool` 内部の `useState` のみで持つ。

## 描画

- 3D プレビュー（右ペインの `Scene` 内）に、ワールド座標系で**円柱 2 本**を重ねて描画
- `neck` は下端 (origin) から `neck.height` 分だけ neck のローカル +Y 方向に伸びる
- `head` は `neck` の上端から `head.height` 分だけ head のローカル +Y 方向に伸びる
- 円柱の見た目: 半透明または線画（色・α は実装時に調整。他のプレビュー要素と干渉しない程度）
- 顔モデル (Billboard) は従来どおりカメラに正対。首姿勢の影響を受けない
- 座標軸・グリッドと同様、トグルで表示/非表示を切り替える

### 実装メモ

- 円柱は three.js の `<cylinderGeometry>` + `<meshBasicMaterial transparent opacity=...>` で簡単に描ける（`cylinderGeometry` はローカル +Y が長さ方向で、原点はジオメトリの中心 = 高さの半分の位置。描画時は `position={[0, height/2, 0]}` でローカル原点を円柱の底面に合わせる）
- ボーンは `<group>` をネストして配置するのが素直:
  - 親 group: position = `origin`、rotation = neck の ZYX オイラー
  - 中に neck の円柱 mesh
  - さらにその子の group: position = `(0, neck.height, 0)`、rotation = head の ZYX オイラー
  - 中に head の円柱 mesh
- 既存の `showAxes` / `showGrid` と同じパターンで、`Scene` の props に `showNeck?: boolean` と `neckModel?: NeckModel` を増やし、`ModelingTool` 側の state から渡す

### カメラとの関係

- カメラは既存の `angle` (yaw/pitch) および OrbitControls で動く
- 首モデルはワールド座標系に固定されているので、カメラが動けばそのカメラから見た姿で描かれる
- 結果「カメラ × neck × head」の合成が見かけを決める、という挙動は `Scene` の通常の描画でそのまま成立する

## 実装の推奨順序

1. `_lib/types.ts` に `NeckBone` / `NeckModel` 型を追加（エクスポート）。`FaceModel` には追加しない
2. `ModelingTool` に `neckModel` と `showNeck` の `useState` を追加、デフォルト値を入れる
3. `Scene` に `showNeck` / `neckModel` の props を追加し、円柱 2 本を描画するコンポーネント（`NeckPreview` など別ファイルに切っても良い）を追加
4. `ModelingTool` の左ペイン「表示設定」にトグルを追加し、パラメータ編集 UI を別セクションとして追加
5. ブラウザで動作確認（顔モデルとの位置関係・回転順序が直感的に合うか）

## 編集 UI

左ペインの「表示設定」または独立セクションに以下を追加:

- **表示トグル**: チェックボックス「首モデル」
- **首（下段）パラメータ**:
  - radius（number input）
  - height（number input）
  - rotation: yaw / pitch / roll（各 number input or range）
- **頭（上段）パラメータ**:
  - radius（number input）
  - height（number input）
  - rotation: yaw / pitch / roll（各 number input or range）
- **origin**: x / y / z（number input）

デフォルト値（実装時に調整可）:
- neck: radius 0.08, height 0.15, rotation (0, 0, 0)
- head: radius 0.1, height 0.2, rotation (0, 0, 0)
- origin: (0, -0.4, 0) 付近（顔モデルの下）

## 将来拡張の余地

Phase 1 を足場として、以下は後続で検討:

1. **Phase 2 — 接合部の線消し**: 首シルエットを `polygon-clipping` で計算し、outline stroke のうち首領域に重なる部分だけ非表示にする（または首と同色で塗る）
2. **Phase 3 — 永続化**: 首モデルを `FaceModel` に組み込み、JSON / Undo/Redo の対象にする
3. **Phase 4 — UE エクスポート**: `neck.rotation` / `head.rotation` を UE のボーン回転として書き出す。ボーン位置（height, radius）は Blender 側のモデリングと数値を合わせる運用

将来的に必要になった時点で個別に判断する。

## 参考

- UE Mannequin の骨構成: `neck_01` + `head`
- 既存の関連モジュール:
  - `_components/Scene.tsx`（3D プレビュー。`showAxes` / `showGrid` の実装パターンをそのまま踏襲）
  - `_components/ModelingTool.tsx`（全体 state。`showAxes` / `showGrid` の state 追加箇所の近くに `neckModel` / `showNeck` を追加）
  - `_lib/types.ts`（型定義）
- プロジェクト全体の進捗: `_doc/20260418_2320/progress.md` とそこから辿れる過去の作業ログを参照
