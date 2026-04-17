# 2D顔モデリングツール 作業進捗 (2026-04-17)

## 概要

Step 0〜7 + UI改善完了後の追加機能。編集体験と正面以外角度の扱いを強化した。

## 本日のコミット（新しい順）

| SHA | 内容 |
|---|---|
| 22a6eb7 | カメラ正対グリッドのトグルを3Dプレビューに追加 |
| 264343d | ワールド座標軸のトグルを3Dプレビューに追加 |
| 137f009 | 制御点ハンドルをインデックスに応じて色分け |
| 42caf76 | OutlinePolygon に左右対称オプション追加 |
| 5b9595c | コアモデル state の Undo/Redo |
| e7976fe | PointEditor にベース形状回転ハンドル追加 |
| 4086a81 | FeaturePolygon の部分ストローク範囲指定 |

## 機能詳細

### 部分ストローク範囲（4086a81）

- FeaturePolygon に `strokeRanges: StrokeRange[] | null` を追加
  - `null` = 全周ストローク（従来動作）
  - `[]` = ストロークなし
  - `[{id, start, end}, ...]` = 指定区間のみ
- 制御点インデックスベース指定。`start > end` は末尾から頭へラップ（周回）可
- StrokeLine に `closed: boolean` を追加し、FaceMesh は開いたポリライン/閉ループを描き分け
- PointEditor に範囲編集モード: 制御点を2回クリック（始点→終点）で範囲追加、右クリックで保留中の始点キャンセル
- ModelingTool の中央ペインに「全周／部分」切替、「範囲追加」ボタン、範囲リスト＋削除UI
- JSON インポートで旧データ（strokeRanges 未指定）に対する互換補完あり

用途: 横から見た耳の外周の一部だけに線を描くケースなど

### PointEditor 回転ハンドル（e7976fe）

- bbox 中心まわりで全点を回転させるハンドル（bbox 上辺から 32px 上）
- DragState に `rotate` を追加
- **注意**: KF 補間は線形（RBF）なのでフレーム間の回転アニメには使えない。ベース形状の一括回転編集用

### Undo/Redo（5b9595c）

- `useHistory<T>` フック + `useDebouncedCommit` を新規追加（`_lib/useHistory.ts`）
- 履歴対象スナップショット: `polygons`, `featureGroups`, `blendShapeWeights`, `outlineFillColor`, `outlineStroke`
- UI 状態（選択、ズーム、角度、編集モード等）は履歴外
- 粒度: state が 300ms 変化しないと自動コミット。ドラッグ中は連続更新になるため、離した後300msで1回記録
- ショートカット: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y（入力要素内では発火しない）
- 左ペイン下部に Undo/Redo ボタン追加（JSON IO の上）
- JSON Import / localStorage 復元時は `history.reset` でクリーンに開始
- 上限 100 ステップ
- 実装ポイント: undo/redo 中は `suppressRef` で debounce コミットを1回抑止し、restore 直後に再スナップショットされるのを防止

### 輪郭の左右対称（42caf76）

- `OutlinePolygon` に `mirrorSymmetric?: boolean` を追加
- 有効時: yaw<0 の描画は、yaw を符号反転して補間した結果を x 反転して表示
- `basePoints` 自体は変えない（正面はそのまま）
- yaw<0 で KF を作ろうとすると alert で拒否（yaw≥0 側が authoritative）
- 既存 yaw<0 KF があるまま有効化する際は確認ダイアログ（無視される旨）

### 制御点のインデックス色分け（137f009）

- 制御点ハンドルの色を hue で等分 (`hsl(i/N * 360, 70%, 45%)`)
- KF 間で同じインデックスの点が追跡しやすくなる
- ドラッグ中（赤）・ストローク範囲編集中（紫/オレンジ）は優先

### 座標軸トグル（264343d）

- 左ペイン「表示設定」に座標軸チェックボックス
- Three.js の `<axesHelper args={[0.5]}>` を条件付き描画（赤=X, 緑=Y, 青=Z）

### カメラ正対グリッド（22a6eb7）

- 左ペイン「表示設定」にグリッドチェックボックス
- `<Billboard>` 内に `<gridHelper>` を XY 平面回転で配置、z=-0.01（顔より奥）
- 1単位・20×20 分割・濃灰と淡灰

## データモデル差分

### types.ts

```ts
// 新規
export interface StrokeRange {
  id: string;
  start: number;
  end: number;
}

// 追加フィールド
export interface OutlinePolygon {
  // ...
  mirrorSymmetric?: boolean;
}

export interface FeaturePolygon {
  // ...
  strokeRanges: StrokeRange[] | null;
}
```

### StrokeLine

```ts
export interface StrokeLine {
  points: Point2D[];
  color: ColorRGBA;
  width: number;
  z: number;
  closed: boolean; // 新規
}
```

## 新規ファイル

- `_lib/useHistory.ts` — Undo/Redo フック（past/future スタック + debounced commit）

## 今後の候補（未実装）

- earcut インデックス焼き込み
- 特徴ポリゴン側のミラー機能
- 複数キャラ配置
- 3D髪メッシュ + 前髪遮蔽
- Masked マテリアル
- フィーチャーポリゴンの (yaw, pitch) KF で matrix を直接編集する UI
- Unreal 移植用 C++ リファレンス実装
