import { CodeEditor } from "../_components/CodeEditor";
import type { AlgorithmContent } from "../_lib/types";

export const binarySearch: AlgorithmContent = {
  slug: "binary-search",
  title: "二分探索",
  description: "TypeScriptで二分探索を実装する方法について解説",
  createdAt: "2025-11-02",
  updatedAt: "2025-11-02",
  content: (
    <>
      <h2>二分探索とは</h2>

      <p>
        二分探索はソートされた配列に対して効率的に要素を検索するためのアルゴリズムです。
      </p>

      <p>
        普通にfind()で前から探索を行うと最悪の場合O(n)の時間がかかります。ですが配列がすでに整列済みならもっと簡単に調べられますよね。
        二分探索は配列の真ん中を取り、その大小で半分に範囲を絞り込んでいきます。この手法を使うとO(log
        n)の時間で要素を見つけることができます。
      </p>

      <h2>二分探索の実装例</h2>

      <CodeEditor
        title="二分探索の実装例"
        defaultCode={`// 準備
const sortedArray = Array.from({ length: 100 }, (_, i) => i + 1); // ソート済み配列

// 二分探索の実装
function binarySearch(array: number[], target: number): { status: "hit" | "not found"; index: number | null } {
  let left = 0;
  let right = array.length - 1;
  let comparisons = 0; // 比較回数をカウントする変数

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midValue = array[mid];
    comparisons++;

    if (midValue === target) {
      console.log(\`比較回数: \${comparisons}\`);
      return { status: "hit", index: mid }; // ターゲットが見つかったので終了
    } else if (midValue < target) {
      left = mid + 1; // ターゲットは右側にある
    } else {
      right = mid - 1; // ターゲットは左側にある
    }
  }

  console.log(\`比較回数: \${comparisons}\`);
  return { status: "not found", index: null }; // ターゲットが見つからなかった場合
}

// 使用例
const target = 42;
const result = binarySearch(sortedArray, target);
if (result.status === "hit") {
  console.log(\`ターゲット \${target} はインデックス \${result.index} にあります。\`);
} else {
  console.log(\`ターゲット \${target} は配列に存在しません。\`);
}
`}
        height="750px"
      />

      <p>
        上記のコードでは、1から100までのソート済み配列に対して二分探索を実装しています。
      </p>

      <p>
        targetがNならfind()では平均でN/2回の比較が必要ですが、二分探索では最大でlog2(N)回の比較で済むことがわかります。例えばNが100の場合、find()では平均50回の比較が必要ですが、二分探索では最大でも約7回の比較で済みます。
      </p>

      <p>
        探索の過程で比較回数をカウントし、結果とともに表示しています。find()ならtargetと同じ回数の比較が必要です。回数を比べてみて効率の違いを実感してみてください。
      </p>

      <h2>まとめ</h2>

      <p>
        ソートされた配列に対して効率的に探索を行うアルゴリズムである二分探索について解説・実装しました。
      </p>

      <p>
        二分探索を使うことで、大規模なデータセットに対しても高速に要素を検索できるようになります。
      </p>

      <p>
        すでにソートされた配列があるという前提は一見すると不思議かもしれませんが、整理されたデータを扱うことで効率化できるというのは重要な考え方です。是非とも覚えておいてください。
      </p>
    </>
  ),
};
