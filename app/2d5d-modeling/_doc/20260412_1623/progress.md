# 2D顔モデリングツール 作業進捗 (2026-04-12)

## 概要

spec (20260411_2231/spec.md) に基づいて、ポリゴンメッシュパイプラインによる2D顔モデリングツールを新規実装した。旧実装（ベジェ曲線ベース）は全削除し、新アーキテクチャで Step 0〜7 + UI改善を完了。

## 実装済み機能

### データ層 (_lib/)

| ファイル | 役割 |
|---|---|
| types.ts | 全データ型定義（OutlinePolygon, FeaturePolygon, FeatureGroup, BlendShape, Mat2 等） |
| catmullRom.ts | 閉じた点列の Catmull-Rom 細分割 |
| triangulate.ts | earcut ラッパー |
| rbf.ts | 2次元 RBF 補間（Gaussian カーネル） |
| interpolateOutline.ts | 輪郭ポリゴンのブレンドシェイプ + (yaw, pitch) キーフレーム補間 |
| interpolateFeature.ts | 特徴ポリゴンのブレンドシェイプ + アフィン変換キーフレーム補間 |
| applyBlendShapes.ts | ブレンドシェイプの重み付き加算 |
| featureGroup.ts | グループのアフィン合成、visibility 矩形判定、layerIndex 最近傍選択 |
| buildGeometry.ts | FaceModel → THREE.BufferGeometry + ストロークデータ生成 |
| mat2utils.ts | 2x2行列の合成/分解（rotation, scaleX, scaleY, shear）、行列乗算 |
| jsonIO.ts | JSON エクスポート/インポート |

### コンポーネント (_components/)

| ファイル | 役割 |
|---|---|
| ModelingTool.tsx | メインコンポーネント。3ペインレイアウト、全 state 管理 |
| Scene.tsx | 3Dプレビュー Canvas（正射影カメラ、OrbitControls、角度/ズーム同期） |
| ReferenceScene.tsx | 参考3Dモデル Canvas（別レイヤー、正射影、角度同期） |
| FaceMesh.tsx | 顔ポリゴンメッシュ描画（Billboard、fill + stroke） |
| PointEditor.tsx | SVGベースの点列編集（ドラッグ、移動、拡縮、ズーム、Catmull-Rom表示） |
| PolygonTree.tsx | ポリゴン/グループのツリー表示 + ドラッグ&ドロップでグループ所属管理 |
| GroupGizmo.tsx | 3Dプレビュー上のグループ変形ハンドル（移動/回転/拡縮/剪断） |

### UIレイアウト（3ペイン）

- **左ペイン**: ポリゴン/グループのツリー一覧、ブレンドシェイプ重みスライダー、表示設定（参考モデル/ポリゴン透明度、背景色、yaw/pitchスライダー）、JSON入出力
- **中央ペイン**: 選択中のポリゴン属性編集（名前、レイヤー、色、塗り/線、α）、PointEditor、キーフレーム一覧、ブレンドシェイプ一覧。グループ選択時はグループ詳細（visibility、KF、layerIndex KF）
- **右ペイン**: 3Dプレビュー + 参考モデル（背面レイヤー） + グループギズモ（選択時）

## 実装ステップの経緯

| Step | 内容 | 状態 |
|---|---|---|
| 0 | 縦串（Catmull-Rom + earcut + BufferGeometry + Billboard + 参考モデル） | 完了 |
| 1 | (yaw, pitch) キーフレーム + 2D RBF 補間 | 完了 |
| 2 | 複数ポリゴン + レイヤー | 完了 |
| 3 | フィーチャーポリゴン（アフィン変換 + α） | 完了 |
| 4 | ブレンドシェイプ | 完了 |
| 5 | FeatureGroup（階層的アフィン合成 + visibility） | 完了 |
| 6 | layerIndex 切替（最近傍選択） | 完了 |
| 7 | JSON 入出力 | 完了 |

## UI改善の経緯

- 3ペインレイアウトに再構成
- ツリー表示 + ドラッグ&ドロップでグループ所属管理
- グループギズモ（移動/回転/拡縮/剪断ハンドル、KF自動作成）
- 自動ID生成 + 編集可能な名前
- yaw/pitch スライダー + キーボードショートカット（1〜6キー）
- グループKFクリックでカメラ角度切替
- PointEditor: 内側ドラッグで全体移動、拡縮ハンドル、ホイールズーム、Catmull-Rom表示、背景色変更
- 同グループの兄弟ポリゴンを薄く背景表示
- ポリゴンの塗り/ストローク切替（3Dプレビュー + PointEditor）
- 色表示の一致修正（linear + toneMapped: false）
- RBF補間の identity からの差分方式（行列/αのGaussian減衰修正）
- 剪断: shearY 廃止（2x2行列の4自由度に合わせて4パラメータに統一）
- ギズモの行列操作を decompose/compose から直接行列乗算に変更

## 技術的な注意点・判断

### 参考3Dモデルの表示
- 別 Canvas で描画して CSS レイヤーで重ねる方式を採用（同一シーンだとソート問題・位置合わせ問題が多発したため）
- カメラの中心はバウンディングボックス中心 + Y方向上方補正
- REFERENCE_SCALE 定数でサイズ調整

### 色の一致
- Three.js の `linear` prop（sRGB変換無効）と `toneMapped: false` が必要
- `premultipliedAlpha` は不要だった

### RBF補間
- 行列とαは identity/1 からの差分を補間し、結果に identity/1 を加算する方式
- そのまま補間すると Gaussian 減衰でキーフレームから離れたとき matrix が 0 に近づきサイズが縮小する問題があった

### 剪断 (shear)
- 2x2行列は4自由度なので、rotation(1) + scaleX(1) + scaleY(1) + shear(1) の4パラメータが独立上限
- shearY は rotation + shearX の組み合わせで等価なので廃止
- ギズモのドラッグ中は decompose/compose の往復ではなく、開始時 matrix に対して直接 mulMat2 で変形を掛ける方式に変更

### PointEditor の座標変換
- SVG の `getScreenCTM().inverse()` を使って正しくスクリーン座標→SVG座標変換
- getBoundingClientRect ベースだと viewBox のアスペクト比とズレる

## 未実装（spec に記載だが未着手）

- earcut インデックス焼き込み（ハイブリッド方式）
- ミラー編集機能（左右対称作成）
- 複数キャラ配置
- 3D髪メッシュ + 前髪遮蔽
- Masked マテリアル（現在は MeshBasicMaterial + vertexColors）
- フィーチャーポリゴンの (yaw, pitch) キーフレームで matrix を直接編集する UI（position と α のみ対応中）
- Unreal 移植用 C++ リファレンス実装

## ファイル構成

```
app/2d5d-modeling/
├── _assets/
│   └── base2.glb
├── _components/
│   ├── FaceMesh.tsx
│   ├── GroupGizmo.tsx
│   ├── ModelingTool.tsx
│   ├── PointEditor.tsx
│   ├── PolygonTree.tsx
│   ├── ReferenceScene.tsx
│   └── Scene.tsx
├── _doc/
│   ├── 20260411_2231/
│   │   └── spec.md
│   └── 20260412_progress.md  ← 本ファイル
├── _lib/
│   ├── applyBlendShapes.ts
│   ├── buildGeometry.ts
│   ├── catmullRom.ts
│   ├── featureGroup.ts
│   ├── interpolateFeature.ts
│   ├── interpolateOutline.ts
│   ├── jsonIO.ts
│   ├── mat2utils.ts
│   ├── rbf.ts
│   ├── triangulate.ts
│   └── types.ts
├── getPath.ts
├── layout.tsx
└── page.tsx
```
