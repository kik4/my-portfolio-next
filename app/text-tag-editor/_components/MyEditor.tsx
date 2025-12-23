/** biome-ignore-all lint/suspicious/noArrayIndexKey: <for utility> */
/** biome-ignore-all lint/a11y/useSemanticElements: <タグ表示に複数要素が必要> */
import Editor from "@monaco-editor/react";
import clsx from "clsx";
import type * as Monaco from "monaco-editor";
import { useMemo, useRef, useState } from "react";
import "./MyEditor.css";
import { formatCode } from "../_utils/formatCode";
import { BASE_EDITOR_ID, type TagWithPosition } from "../page";

export const MyEditor = ({
  editorId,
  code,
  onCodeChange,
  tagsMap = new Map(),
  inEditorDuplicateMap = new Map(),
  baseEditorDuplicateMap = new Map(),
  crossEditorDuplicates = new Set(),
}: {
  editorId: string;
  code: string;
  onCodeChange: (code: string) => void;
  tagsMap?: Map<string, TagWithPosition[]>;
  inEditorDuplicateMap?: Map<string, Set<string>>;
  baseEditorDuplicateMap?: Map<string, Set<string>>;
  crossEditorDuplicates?: Set<string>;
}) => {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [decorations, setDecorations] = useState<string[]>([]);
  const duplicateDecorationsRef = useRef<string[]>([]);
  const baseEditorDecorationsRef = useRef<string[]>([]);
  const crossEditorDecorationsRef = useRef<string[]>([]);

  const handleEditorDidMount = (
    editor: Monaco.editor.IStandaloneCodeEditor,
    monaco: typeof Monaco,
  ) => {
    editorRef.current = editor;
    // カスタム言語を登録
    monaco.languages.register({ id: "custom-tags" });

    // シンタックスハイライトを定義
    monaco.languages.setMonarchTokensProvider("custom-tags", {
      tokenizer: {
        root: [
          // 行頭の # で始まる行をコメントとして扱う
          [/^#.*$/, "comment"],
        ],
      },
    });

    // カスタムテーマを定義（コメントの色を設定）
    monaco.editor.defineTheme("custom-theme", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "008000", fontStyle: "italic" }, // 緑色・イタリック
      ],
      colors: {},
    });

    // テーマを適用
    monaco.editor.setTheme("custom-theme");

    // フォーマット用のショートカットキーを登録 (Shift+Alt+F)
    editor.addAction({
      id: "format-tags",
      label: "Format Tags",
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      ],
      run: (ed) => {
        const model = ed.getModel();
        if (!model) return;

        const content = model.getValue();
        const formatted = formatCode(content);
        model.setValue(formatted);
      },
    });

    // ドラッグ&ドロップイベントリスナーを追加
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      domNode.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // テキストファイルかチェック
        if (file.type && !file.type.startsWith("text/")) {
          // type が空の場合も処理を続ける（拡張子で判断）
          const extension = file.name.split(".").pop()?.toLowerCase();
          const textExtensions = [
            "txt",
            "md",
            "csv",
            "json",
            "xml",
            "html",
            "css",
            "js",
            "ts",
            "tsx",
            "jsx",
          ];
          if (!extension || !textExtensions.includes(extension)) {
            alert("テキストファイルのみドロップできます");
            return;
          }
        }

        try {
          const text = await file.text();
          const model = editor.getModel();
          if (model) {
            model.setValue(text);
            onCodeChange(text);
          }
        } catch (error) {
          console.error("ファイル読み込みエラー:", error);
          alert("ファイルの読み込みに失敗しました");
        }
      });
    }
  };

  // タグリストを取得
  const tags = tagsMap.get(editorId) || [];
  const baseTags = tagsMap.get(BASE_EDITOR_ID) || [];

  // 重複タグをハイライトするデコレーションを追加
  useMemo(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    // 重複タグのデコレーションを作成（同一エディター内の重複）
    const duplicateDecorations = tags
      .filter((tagObj) => inEditorDuplicateMap.get(editorId)?.has(tagObj.tag))
      .map((tagObj) => ({
        range: {
          startLineNumber: tagObj.lineNumber,
          startColumn: tagObj.startColumn,
          endLineNumber: tagObj.lineNumber,
          endColumn: tagObj.endColumn,
        },
        options: {
          className: "duplicate-tag-highlight",
          inlineClassName: "duplicate-tag-inline",
        },
      }));

    // 既存の重複デコレーションを更新
    const newDecorations = model.deltaDecorations(
      duplicateDecorationsRef.current,
      duplicateDecorations,
    );
    duplicateDecorationsRef.current = newDecorations;
  }, [tags, inEditorDuplicateMap, editorId]);

  // Baseエディターとの重複をハイライトするデコレーションを追加
  useMemo(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    // Baseエディターとの重複タグのデコレーションを作成
    const baseEditorDecorations = tags
      .filter((tagObj) => baseEditorDuplicateMap.get(editorId)?.has(tagObj.tag))
      .map((tagObj) => ({
        range: {
          startLineNumber: tagObj.lineNumber,
          startColumn: tagObj.startColumn,
          endLineNumber: tagObj.lineNumber,
          endColumn: tagObj.endColumn,
        },
        options: {
          className: "base-editor-duplicate-highlight",
          inlineClassName: "base-editor-duplicate-inline",
        },
      }));

    // 既存のBaseエディターデコレーションを更新
    const newDecorations = model.deltaDecorations(
      baseEditorDecorationsRef.current,
      baseEditorDecorations,
    );
    baseEditorDecorationsRef.current = newDecorations;
  }, [tags, baseEditorDuplicateMap, editorId]);

  // エディター間で重複しているタグをハイライトするデコレーションを追加
  useMemo(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    // エディター間で重複しているタグのデコレーションを作成
    const crossEditorDecorations = tags
      .filter((tagObj) => crossEditorDuplicates.has(tagObj.tag))
      .map((tagObj) => ({
        range: {
          startLineNumber: tagObj.lineNumber,
          startColumn: tagObj.startColumn,
          endLineNumber: tagObj.lineNumber,
          endColumn: tagObj.endColumn,
        },
        options: {
          className: "cross-editor-duplicate-highlight",
          inlineClassName: "cross-editor-duplicate-inline",
        },
      }));

    // 既存のクロスエディターデコレーションを更新
    const newDecorations = model.deltaDecorations(
      crossEditorDecorationsRef.current,
      crossEditorDecorations,
    );
    crossEditorDecorationsRef.current = newDecorations;
  }, [tags, crossEditorDuplicates]);

  // タグにホバーした時のハンドラー
  const handleTagHover = (tagObj: TagWithPosition) => {
    const editor = editorRef.current;
    if (!editor) return;

    // エディター内の対応する位置をハイライト
    const model = editor.getModel();
    if (!model) return;

    const newDecorations = model.deltaDecorations(decorations, [
      {
        range: {
          startLineNumber: tagObj.lineNumber,
          startColumn: tagObj.startColumn,
          endLineNumber: tagObj.lineNumber,
          endColumn: tagObj.endColumn,
        },
        options: {
          className: "tag-highlight",
          inlineClassName: "tag-highlight-inline",
        },
      },
    ]);

    setDecorations(newDecorations);
  };

  // ホバーを外した時のハンドラー
  const handleTagLeave = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    // ハイライトをクリア
    const newDecorations = model.deltaDecorations(decorations, []);
    setDecorations(newDecorations);
  };

  // タグを削除するハンドラー
  const handleDeleteTag = (tagObj: TagWithPosition) => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const line = model.getLineContent(tagObj.lineNumber);

    // 該当するタグの位置だけを削除（位置情報を使用）
    const parts = line.split(",");
    let currentPosition = 0;
    let targetIndex = -1;

    // 削除対象のタグのインデックスを見つける
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const startColumn = currentPosition + 1;
      const trimmedTag = part.trim();

      if (trimmedTag) {
        const trimStart = part.indexOf(trimmedTag);
        const actualStartColumn = startColumn + trimStart;
        const actualEndColumn = actualStartColumn + trimmedTag.length;

        // 位置情報が一致するタグを見つける
        if (
          actualStartColumn === tagObj.startColumn &&
          actualEndColumn === tagObj.endColumn &&
          trimmedTag === tagObj.tag
        ) {
          targetIndex = i;
          break;
        }
      }

      currentPosition += part.length + (i < parts.length - 1 ? 1 : 0);
    }

    if (targetIndex === -1) {
      // 見つからない場合は何もしない
      return;
    }

    // 該当するインデックスのタグだけを削除
    const newParts = parts
      .filter((_, index) => index !== targetIndex)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    // 新しい行の内容を作成
    if (newParts.length === 0) {
      // 行が空になる場合は行全体を削除
      const range = {
        startLineNumber: tagObj.lineNumber,
        startColumn: 1,
        endLineNumber: tagObj.lineNumber + 1,
        endColumn: 1,
      };

      // 最終行の場合は改行文字を考慮
      if (tagObj.lineNumber === model.getLineCount()) {
        const prevLineRange = {
          startLineNumber: tagObj.lineNumber - 1,
          startColumn: model.getLineMaxColumn(tagObj.lineNumber - 1),
          endLineNumber: tagObj.lineNumber,
          endColumn: model.getLineMaxColumn(tagObj.lineNumber),
        };
        model.pushEditOperations(
          [],
          [{ range: prevLineRange, text: "" }],
          () => null,
        );
      } else {
        model.pushEditOperations([], [{ range, text: "" }], () => null);
      }
    } else {
      // タグが残っている場合は行を更新
      const newLine = newParts.join(", ");
      const range = {
        startLineNumber: tagObj.lineNumber,
        startColumn: 1,
        endLineNumber: tagObj.lineNumber,
        endColumn: model.getLineMaxColumn(tagObj.lineNumber),
      };
      model.pushEditOperations([], [{ range, text: newLine }], () => null);
    }

    // エディターの値を更新（親コンポーネントのstateも更新）
    onCodeChange(model.getValue());
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* エディターペイン */}
      <div className="overflow-hidden rounded-lg border border-gray-300">
        <div className="border-gray-300 border-b bg-gray-100 px-4 py-2">
          <h2 className="font-semibold text-gray-700 text-sm">エディター</h2>
        </div>
        <Editor
          height="600px"
          defaultLanguage="custom-tags"
          value={code}
          onChange={(value) => onCodeChange(value || "")}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            scrollbar: {
              alwaysConsumeMouseWheel: false,
            },
          }}
        />
      </div>

      {/* プレビューペイン */}
      <div className="overflow-hidden rounded-lg border border-gray-300">
        <div className="border-gray-300 border-b bg-gray-100 px-4 py-2">
          <h2 className="font-semibold text-gray-700 text-sm">プレビュー</h2>
        </div>
        <div className="h-full bg-white">
          {editorId !== BASE_EDITOR_ID && (
            <div className="flex flex-wrap items-start gap-2 border-gray-300 border-b p-2">
              {baseTags.map((tagObj, index) => {
                const isBaseEditorDuplicate = baseEditorDuplicateMap
                  .get(editorId)
                  ?.has(tagObj.tag);

                return (
                  <div
                    key={index}
                    className={clsx(
                      "group flex items-center gap-1 rounded border px-1 py-0.5 text-sm",
                      isBaseEditorDuplicate
                        ? "border-yellow-400 bg-yellow-100 text-yellow-700"
                        : "border-gray-300",
                    )}
                    title={`Base: Line ${tagObj.lineNumber}, Col ${tagObj.startColumn}-${tagObj.endColumn}${
                      isBaseEditorDuplicate ? " (Baseエディターとの重複)" : ""
                    }`}
                    role="button"
                    tabIndex={0}
                  >
                    <span>{tagObj.tag}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap items-start gap-2 p-2">
            {tags.map((tagObj, index) => {
              const inEditorDuplicate = inEditorDuplicateMap
                .get(editorId)
                ?.has(tagObj.tag);
              const isBaseEditorDuplicate = baseEditorDuplicateMap
                .get(editorId)
                ?.has(tagObj.tag);
              const isCrossEditorDuplicate = crossEditorDuplicates.has(
                tagObj.tag,
              );

              return (
                <div
                  key={index}
                  className={clsx(
                    "group flex items-center gap-1 rounded border px-1 py-0.5 text-sm",
                    inEditorDuplicate
                      ? "border-red-400 bg-red-100 text-red-500"
                      : isBaseEditorDuplicate
                        ? "border-yellow-400 bg-yellow-100 text-yellow-700"
                        : isCrossEditorDuplicate
                          ? "border-orange-400 bg-orange-100 text-orange-600"
                          : "border-gray-300 hover:border-blue-400 hover:bg-blue-100",
                  )}
                  title={`Line ${tagObj.lineNumber}, Col ${tagObj.startColumn}-${tagObj.endColumn}${
                    inEditorDuplicate
                      ? " (同一エディター内で重複)"
                      : isBaseEditorDuplicate
                        ? " (Baseエディターとの重複)"
                        : isCrossEditorDuplicate
                          ? " (エディター間で重複)"
                          : ""
                  }`}
                  onMouseEnter={() => handleTagHover(tagObj)}
                  onMouseLeave={handleTagLeave}
                  role="button"
                  tabIndex={0}
                >
                  <span>{tagObj.tag}</span>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTag(tagObj);
                    }}
                    aria-label={`Delete ${tagObj.tag}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
