"use client";

import {
  ArrowUp,
  Download,
  FileText,
  Trash2,
  Underline,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { MyLink } from "../_components/MyLink";
import { getPathToHome } from "../(home)/getPath";
import { MyEditor } from "./_components/MyEditor";
import { formatCode } from "./_utils/formatCode";
import { getTagWithPositions } from "./_utils/getTagWithPositions";
import { loadFromFile } from "./_utils/loadFromJsonFile";
import { saveToFile } from "./_utils/saveToJsonFile";
import { saveToTagFile } from "./_utils/saveToTagFile";

export type TagWithPosition = {
  tag: string;
  lineNumber: number; // 行番号 (1始まり)
  startColumn: number; // 開始位置
  endColumn: number; // 終了位置
};

export type EditorInstance = {
  id: string;
  code: string;
};

export const BASE_EDITOR_ID = "base";
const STORAGE_KEY = "tag-editor-state";

const DEFAULT_EDITORS: EditorInstance[] = [
  {
    id: BASE_EDITOR_ID,
    code: "# ここにタグを入力します\ntag1, tag2, tag3",
  },
];

const getSaveData = (editors: EditorInstance[]) => {
  return JSON.stringify(editors.map((v) => ({ id: v.id, code: v.code })));
};

export default function TagEditor() {
  const [editors, setEditors] = useState<EditorInstance[]>(DEFAULT_EDITORS);

  // クライアント側でマウント後にローカルストレージから復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as EditorInstance[];
        // baseエディターが存在することを確認
        if (parsed.some((e) => e.id === BASE_EDITOR_ID)) {
          setEditors(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load saved state:", error);
    }
  }, []);

  // 編集内容を自動保存（初回マウント後のみ）
  useEffect(() => {
    // 初回マウント時はスキップ（復元useEffectが先に実行されるため）
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, getSaveData(editors));
      } catch (error) {
        console.error("Failed to save state:", error);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [editors]);

  const addEditor = () => {
    const newId = Date.now().toString();
    setEditors([
      ...editors,
      {
        id: newId,
        code: "# 新しいエディター\n",
      },
    ]);
  };

  const removeEditor = (id: string) => {
    // baseエディターは削除不可
    if (id === BASE_EDITOR_ID) {
      return;
    }
    setEditors(editors.filter((editor) => editor.id !== id));
  };

  const updateEditorCode = (
    id: string,
    newCode: string | ((prevCode: string) => string),
  ) => {
    setEditors(
      editors.map((editor) => {
        if (editor.id === id) {
          const updatedCode =
            typeof newCode === "function" ? newCode(editor.code) : newCode;
          return { ...editor, code: updatedCode };
        }
        return editor;
      }),
    );
  };

  // エディターごとのタグリストを計算
  const tagsMap = useMemo(() => {
    const map = new Map<string, TagWithPosition[]>(); // editorId -> tags
    editors.forEach((editor) => {
      map.set(editor.id, getTagWithPositions(editor.code));
    });
    return map;
  }, [editors]);

  // Baseエディターのタグセットを計算
  const baseTags = useMemo<Set<string>>(() => {
    return new Set(tagsMap.get(BASE_EDITOR_ID)?.map((t) => t.tag) || []);
  }, [tagsMap]);

  // 重複タグのセットを計算
  const inEditorDuplicateMap = useMemo<Map<string, Set<string>>>(() => {
    const duplicatesMap = new Map<string, Set<string>>();
    tagsMap.entries().forEach(([editorId, tags]) => {
      const duplicates = new Set<string>();
      const tagCount = new Map<string, number>();
      tags.forEach((tagObj) => {
        tagCount.set(tagObj.tag, (tagCount.get(tagObj.tag) || 0) + 1);
      });
      tagCount.forEach((count, tag) => {
        if (count > 1) {
          duplicates.add(tag);
        }
      });
      duplicatesMap.set(editorId, duplicates);
    });
    return duplicatesMap;
  }, [tagsMap]);

  // Baseエディターとの重複を計算
  const baseEditorDuplicateMap = useMemo<Map<string, Set<string>>>(() => {
    const duplicatesMap = new Map<string, Set<string>>();
    tagsMap.entries().forEach(([editorId, tags]) => {
      // Baseエディター自身はスキップ
      if (editorId === BASE_EDITOR_ID) return;

      const duplicates = new Set<string>();
      tags.forEach((tagObj) => {
        if (baseTags.has(tagObj.tag)) {
          duplicates.add(tagObj.tag);
        }
      });
      duplicatesMap.set(editorId, duplicates);
    });
    return duplicatesMap;
  }, [tagsMap, baseTags]);

  // エディター間で重複しているタグを計算（Base以外のエディター間）
  const crossEditorDuplicates = useMemo<Set<string>>(() => {
    const tagToEditors = new Map<string, string[]>();
    tagsMap.entries().forEach(([editorId, tags]) => {
      // Baseエディターはスキップ
      if (editorId === BASE_EDITOR_ID) return;

      tags.forEach((tagObj) => {
        const editorIds = tagToEditors.get(tagObj.tag) || [];
        if (!editorIds.includes(editorId)) {
          editorIds.push(editorId);
        }
        tagToEditors.set(tagObj.tag, editorIds);
      });
    });
    return new Set(
      Array.from(tagToEditors.entries())
        .filter(([_, editorIds]) => editorIds.length > 1)
        .map(([tag]) => tag),
    );
  }, [tagsMap]);

  const resetToDefault = () => {
    if (
      confirm(
        "すべての編集内容を削除して初期状態に戻しますか？この操作は取り消せません。",
      )
    ) {
      setEditors(DEFAULT_EDITORS);
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      <header className="border-b bg-white">
        <nav className="container mx-auto flex items-center justify-between px-6 py-3">
          <MyLink
            href={getPathToHome()}
            className="text-gray-600 text-sm hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          >
            ← ホーム
          </MyLink>
          <h1 className="font-bold text-gray-800 text-lg">
            テキストタグエディター
          </h1>
          <div className="w-16" />
        </nav>
      </header>

      <div className="mx-auto max-w-7xl p-8">
        <div className="mb-4 flex items-end justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={resetToDefault}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-gray-700 text-sm hover:bg-gray-50"
            >
              <Trash2 className="mr-2 inline-block" size={16} />
              リセット
            </button>
            <button
              type="button"
              onClick={() => saveToFile(getSaveData(editors))}
              className="rounded border border-green-500 bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600"
              title="現在のエディター状態をJSONファイルとして保存します"
            >
              <Download className="mr-2 inline-block" size={16} />
              ファイルに保存
            </button>
            <button
              type="button"
              onClick={() =>
                loadFromFile((content) => {
                  const parsed = JSON.parse(content) as EditorInstance[];

                  // baseエディターが存在することを確認
                  if (!parsed.some((e) => e.id === BASE_EDITOR_ID)) {
                    toast.error(
                      "無効なファイル形式です（baseエディターが見つかりません）",
                    );
                    return;
                  }

                  setEditors(parsed);
                  localStorage.setItem(STORAGE_KEY, getSaveData(parsed));
                  toast.success("読み込みました");
                })
              }
              className="rounded border border-blue-500 bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
              title="JSONファイルからエディター状態を読み込みます"
            >
              <Upload className="mr-2 inline-block" size={16} />
              ファイルから読み込み
            </button>
            <button
              type="button"
              onClick={() => {
                if (crossEditorDuplicates.size === 0) {
                  toast.info("共通する差分タグはありません");
                  return;
                }

                crossEditorDuplicates.forEach((tag) => {
                  // すべてのエディターからタグを削除
                  setEditors((prevEditors) =>
                    prevEditors.map((editor) => ({
                      ...editor,
                      code: formatCode(
                        formatCode(editor.code)
                          .split("\n")
                          .map((line) =>
                            line.length && !line.startsWith("#")
                              ? `${line
                                  .slice(0, -1)
                                  .split(", ")
                                  .filter((t) => t.trim() !== tag)
                                  .join(", ")},`
                              : line,
                          )
                          .join("\n"),
                      ),
                    })),
                  );
                });

                // Baseエディターにタグを追加
                setEditors((prevEditors) =>
                  prevEditors.map((editor) => {
                    if (editor.id === BASE_EDITOR_ID) {
                      const lines = formatCode(editor.code).split("\n");
                      const toPush = [...crossEditorDuplicates.values()].join(
                        ", ",
                      );
                      if (toPush.length) {
                        lines.push(`${toPush},`);
                      }
                      return { ...editor, code: lines.join("\n") };
                    }
                    return editor;
                  }),
                );
              }}
              className="rounded border border-orange-500 bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600"
              title="共通する差分タグを共通タグへ移動します"
            >
              <ArrowUp className="mr-2 inline-block" size={16} />
              共通する差分タグを共通タグへ移動
            </button>
            <button
              type="button"
              onClick={() => {
                if (editors.length <= 1) {
                  toast.info(
                    "エディターが1つしかないため、タグファイルを出力できません",
                  );
                  return;
                }
                const baseTags =
                  tagsMap.get(BASE_EDITOR_ID)?.map((t) => t.tag) || [];
                tagsMap.entries().forEach(([editorId, tags], index) => {
                  if (editorId === BASE_EDITOR_ID) return;
                  const tagList = [...baseTags, ...tags.map((t) => t.tag)].join(
                    ", ",
                  );
                  saveToTagFile(tagList, index.toString());
                });
              }}
              className="rounded border border-yellow-500 bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600"
              title="差分エディターごとにタグファイルを出力します"
            >
              <FileText className="mr-2 inline-block" size={16} />
              タグファイルを出力
            </button>
            <button
              type="button"
              onClick={() => {
                setEditors((prev) =>
                  prev.map((editor) => ({
                    ...editor,
                    code: formatCode(editor.code),
                  })),
                );
              }}
              className="rounded border border-b-emerald-500 bg-emerald-500 px-4 py-2 text-sm text-white hover:bg-emerald-600"
              title="全てのエディターのテキストをフォーマットします"
            >
              <Underline className="mr-2 inline-block" size={16} />
              テキストをフォーマット
            </button>
          </div>
          <button
            type="button"
            onClick={addEditor}
            className="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
          >
            + 差分エディターを追加
          </button>
        </div>

        <div className="space-y-8">
          {editors.map((editor, index) => (
            <div key={editor.id} className="relative">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium text-gray-600 text-sm">
                  {editor.id === BASE_EDITOR_ID ? (
                    <>
                      基本タグ
                      <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-blue-700 text-xs">
                        共通部分
                      </span>
                    </>
                  ) : (
                    <>
                      差分タグ {index}
                      <span className="ml-2 rounded bg-violet-100 px-2 py-0.5 text-violet-700 text-xs">
                        出力
                      </span>
                    </>
                  )}
                </h3>
                {editor.id !== BASE_EDITOR_ID && (
                  <button
                    type="button"
                    onClick={() => removeEditor(editor.id)}
                    className="rounded bg-red-500 px-3 py-1 text-white text-xs hover:bg-red-600"
                  >
                    削除
                  </button>
                )}
              </div>
              <MyEditor
                editorId={editor.id}
                code={editor.code}
                onCodeChange={(newCode) => updateEditorCode(editor.id, newCode)}
                tagsMap={tagsMap}
                inEditorDuplicateMap={inEditorDuplicateMap}
                baseEditorDuplicateMap={baseEditorDuplicateMap}
                crossEditorDuplicates={crossEditorDuplicates}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
