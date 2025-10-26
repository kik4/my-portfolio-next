import { CodeEditor } from "../_components/CodeEditor";
import type { AlgorithmContent } from "../_lib/types";

export const sortAlgorithm: AlgorithmContent = {
  slug: "sort-algorithm",
  title: "ソートアルゴリズムを書く",
  description: "TypeScriptでソートアルゴリズムを実装する方法について解説",
  createdAt: "2025-10-27",
  updatedAt: "2025-10-27",
  content: (
    <>
      <h2>ソートアルゴリズムを実装してみよう</h2>

      <p>
        TypeScriptでは配列のsort()メソッドを使うことで簡単にソートが実装できますが、せっかくなのでソートアルゴリズムを自分で実装してみましょう。
      </p>

      <p>
        Wikipediaなどでソートアルゴリズムについて調べると具体的な説明や実装例が見つかります。解説はそちらに任せ、ここではTypeScriptでの実装例を紹介します。
      </p>

      <h2>マージソートの実装例</h2>

      <p>
        例えば2つの小さい順に整列済みの配列を先頭から順番に比較して、より小さい要素を新しい配列に追加していくことで、1つのソート済みの配列を作ることができます。与えられた配列を分割して再帰的にその操作を行っていくのがマージソートの基本的な考え方です。
      </p>

      <CodeEditor
        title="マージソートの実装例"
        defaultCode={`// 実装
function mergeSort<T>(arr: T[], compareFunc: (a: T, b: T) => number): T[] {
  if (arr.length <= 1) return arr;
  const m = Math.ceil(arr.length / 2);
  const left = arr.slice(0, m);
  const right = arr.slice(m);
  return merge(
    mergeSort(left, compareFunc),
    mergeSort(right, compareFunc),
    compareFunc,
  );
}

function merge<T>(
  left: T[],
  right: T[],
  compareFunc: (a: T, b: T) => number,
): T[] {
  const result: T[] = [];
  while (true) {
    if (left[0] === undefined) {
      result.push(...right);
      return result;
    }
    if (right[0] === undefined) {
      result.push(...left);
      return result;
    }
    const c = compareFunc(left[0], right[0]);
    if (c <= 0) {
      result.push(left.shift()!);
    } else {
      result.push(right.shift()!);
    }
  }
}

{
  // 入力
  const input = Array.from({ length: 100000 }, () =>
    Math.floor(Math.random() * 1000000),
  ); // ランダムな数値配列
  const compareFunc = (a: number, b: number) => a - b;
  const copiedInput = input.slice();

  // 実行
  const d1 = Date.now();
  const res = mergeSort(input, compareFunc);
  const d2 = Date.now();
  copiedInput.sort(compareFunc);
  const d3 = Date.now();
  console.log(
    "正しい並びかどうか:",
    res.toString() === copiedInput.toSorted(compareFunc).toString(),
  );
  console.log("自作ソート実行時間:", d2 - d1, "ms");
  console.log("組み込みソート実行時間:", d3 - d2, "ms");
}`}
        height="750px"
      />

      <p>
        試しに1000個のランダムな数値を並び替えてみて、自作のマージソートと組み込みのsort()メソッドの実行時間を比較しています。結果はいかがでしょうか？これだとあまり差が出ないかもしれないので、無理のない範囲で配列の要素数を増やして試してみてください。
      </p>

      <h2>クイックソートの実装例</h2>

      <p>
        クイックソートは配列の中からピボットと呼ばれる要素を選び、その要素を基準にして配列を2つの部分に分けることでソートを行います。具体的には、ピボットより小さい要素を左側に、大きい要素を右側に配置し、その後再帰的に各部分をソートしていきます。
      </p>

      <p>
        ピボットの選び方などの工夫があり、この説明だけだと分かりづらいので詳しくはWikipediaなどを参照してください。今回はメジャーな真ん中をピボットに選んで両端から走査・入れ替えていく手法で実装します。
      </p>

      <p>
        クイックソートはその名の通り他のソート法と比べて一般的に最も高速だと言われており、よく使われるソートアルゴリズムの1つです。名前だけは覚えておいて損はありません。
      </p>

      <CodeEditor
        title="クイックソートの実装例"
        defaultCode={`// 実装
function quickSort<T>(
  arr: T[],
  start: number,
  end: number,
  compareFunc: (a: T, b: T) => number,
): T[] {
  if (start >= end - 1) return arr;

  let pivotIndex = Math.floor((start + end) / 2);
  pivotIndex = partition(arr, start, end, pivotIndex, compareFunc);
  quickSort(arr, start, pivotIndex, compareFunc);
  quickSort(arr, pivotIndex, end, compareFunc);
  return arr;
}

function partition<T>(
  arr: T[],
  start: number,
  end: number,
  pivotIndex: number,
  compareFunc: (a: T, b: T) => number,
): number {
  const pivot = arr[pivotIndex];
  let i = start,
    j = end;
  while (true) {
    while (compareFunc(pivot, arr[i]) > 0) i++;
    j--;
    while (compareFunc(pivot, arr[j]) < 0) j--;
    if (i >= j) return i;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    i++;
  }
}

{
  // 入力
  const input = Array.from({ length: 1000 }, () =>
    Math.floor(Math.random() * 10000),
  ); // ランダムな数値配列
  const compareFunc = (a: number, b: number) => a - b;
  const copiedInput = input.slice();

  // 実行
  const d1 = Date.now();
  const res = quickSort(input, 0, input.length, compareFunc);
  const d2 = Date.now();
  copiedInput.sort(compareFunc);
  const d3 = Date.now();
  console.log("正しい並びかどうか:", res.toString() === copiedInput.toString());
  console.log("自作ソート実行時間:", d2 - d1, "ms");
  console.log("組み込みソート実行時間:", d3 - d2, "ms");
}`}
        height="650px"
      />

      <p>
        実行結果はいかがだったでしょうか？私の環境では、要素数を増やすと自作のクイックソートの方が組み込みのsort()メソッドよりも速くなりました。これには組み込みのsort()メソッドが安定ソート（同じ値の要素の場合に元の順序を保持する）であり、不安定ソートであるクイックソートを使用していないことが影響しているかもしれません。
      </p>

      <h2>まとめ</h2>

      <p>
        ここではマージソートとクイックソートの2つのソートアルゴリズムのTypeScriptでの実装例を紹介しました。実務では組み込みのsort()メソッドを使うことがほとんどですが、ソートアルゴリズムの基本的な考え方や実装方法を理解しておくことはアルゴリズム全般の理解にも役立ちます。
      </p>

      <p>
        さらに他のソートアルゴリズムについても興味があれば調べてみてください。バブルソートや挿入ソート、ヒープソートなど、様々なアルゴリズムが存在します。それぞれの特徴や適用場面を理解することで、より深いアルゴリズムの知識を身につけることができます。
      </p>
    </>
  ),
};
