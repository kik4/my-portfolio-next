"use client";

import Editor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";

export function CodeEditor({
  title,
  defaultCode,
  height = "300px",
}: {
  title: string;
  defaultCode: string;
  height?: string;
}) {
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState<string[]>([]);
  const [jsCode, setJsCode] = useState("");
  const [activeTab, setActiveTab] = useState<"output" | "javascript">("output");
  const [isRunning, setIsRunning] = useState(false);
  const [editorHeight, setEditorHeight] = useState(
    Number.parseInt(height, 10) || 300,
  );
  const [isResizing, setIsResizing] = useState(false);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(0);

  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    setIsResizing(true);
    resizeStartYRef.current = e.clientY;
    resizeStartHeightRef.current = editorHeight;
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizing) return;
      const deltaY = e.clientY - resizeStartYRef.current;
      const newHeight = Math.max(200, resizeStartHeightRef.current + deltaY);
      setEditorHeight(newHeight);
    }

    function handleMouseUp() {
      setIsResizing(false);
    }

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing]);

  function handleEditorWillMount(monaco: typeof Monaco) {
    // Monaco Editorの設定
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      lib: ["dom", "dom.iterable", "esnext"],
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    });
  }

  function handleEditorDidMount(editor: Monaco.editor.IStandaloneCodeEditor) {
    editorRef.current = editor;
  }

  async function runCode() {
    setIsRunning(true);
    setOutput([]);

    try {
      const Babel = await import("@babel/standalone");

      const result = Babel.transform(code, {
        presets: ["typescript"],
        filename: "playground.ts",
      });

      if (!result.code) {
        setOutput(["Error: Compilation failed"]);
        setIsRunning(false);
        return;
      }

      const compiledJS = result.code;
      setJsCode(compiledJS);

      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args: unknown[]) => {
        logs.push(
          args
            .map((arg) =>
              typeof arg === "object"
                ? JSON.stringify(arg, null, 2)
                : String(arg),
            )
            .join(" "),
        );
        originalLog(...args);
      };

      console.error = (...args: unknown[]) => {
        logs.push(`❌ Error: ${args.map((arg) => String(arg)).join(" ")}`);
        originalError(...args);
      };

      console.warn = (...args: unknown[]) => {
        logs.push(`⚠️ Warning: ${args.map((arg) => String(arg)).join(" ")}`);
        originalWarn(...args);
      };

      try {
        // eslint-disable-next-line no-new-func
        const func = new Function(compiledJS);
        func();

        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (logs.length === 0) {
          logs.push("✅ コードは正常に実行されましたが、出力はありません");
        }
      } catch (error) {
        logs.push(
          `❌ Runtime Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      }

      setOutput(logs);
    } catch (error) {
      setOutput([
        `❌ Compilation Error: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    } finally {
      setIsRunning(false);
    }
  }

  function resetCode() {
    setCode(defaultCode);
    setOutput([]);
    setJsCode("");
  }

  return (
    <div className="my-6 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-gray-200 border-b bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="font-semibold text-gray-900 text-sm dark:text-white">
          {title}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetCode}
            className="rounded bg-gray-200 px-3 py-1 text-gray-700 text-xs transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            リセット
          </button>
          <button
            type="button"
            onClick={runCode}
            disabled={isRunning}
            className="rounded bg-blue-600 px-4 py-1 font-medium text-white text-xs transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? "実行中..." : "▶ 実行"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        <Editor
          height={`${editorHeight}px`}
          defaultLanguage="typescript"
          value={code}
          onChange={(value) => setCode(value || "")}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
          }}
        />
        {/* Resize Handle */}
        <button
          type="button"
          onMouseDown={handleResizeStart}
          className={`group absolute inset-x-0 bottom-0 flex h-2 w-full cursor-ns-resize items-center justify-center border-gray-200 border-t bg-gray-100 transition-colors hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 ${
            isResizing ? "bg-gray-200 dark:bg-gray-700" : ""
          }`}
          title="ドラッグしてエディターの高さを調整"
          aria-label="エディターの高さを調整"
        >
          <div className="h-0.5 w-12 rounded-full bg-gray-400 transition-colors group-hover:bg-gray-600 dark:bg-gray-600 dark:group-hover:bg-gray-400" />
        </button>
      </div>

      {/* Output Tabs */}
      <div className="flex border-gray-200 border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setActiveTab("output")}
          className={`border-gray-200 border-r px-4 py-2 text-xs transition dark:border-gray-700 ${
            activeTab === "output"
              ? "bg-white font-medium text-gray-900 dark:bg-gray-800 dark:text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          実行結果
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("javascript")}
          className={`px-4 py-2 text-xs transition ${
            activeTab === "javascript"
              ? "bg-white font-medium text-gray-900 dark:bg-gray-800 dark:text-white"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          JavaScript
        </button>
      </div>

      {/* Output Content */}
      <div className="max-h-60 overflow-auto bg-gray-50 p-4 dark:bg-gray-900">
        {activeTab === "output" ? (
          <div className="font-mono text-xs">
            {output.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400">
                「実行」ボタンをクリックすると、ここに結果が表示されます
              </div>
            ) : (
              output.map((log, index) => (
                <div
                  key={`${log}-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: safe index usage
                    index
                  }`}
                  className="border-gray-200 border-b py-1 text-gray-800 last:border-b-0 dark:border-gray-700 dark:text-gray-200"
                >
                  {log}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="font-mono text-xs">
            {jsCode ? (
              <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {jsCode}
              </pre>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">
                コードを実行すると、コンパイルされたJavaScriptが表示されます
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
