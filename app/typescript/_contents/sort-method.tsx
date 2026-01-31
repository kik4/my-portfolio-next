import { ExternalLink } from "lucide-react";
import { MyLink } from "@/app/_components/MyLink";
import { CodeEditor } from "../_components/CodeEditor";
import type { AlgorithmContent } from "../_lib/types";

export const sortMethod: AlgorithmContent = {
  slug: "sort-method",
  title: "ソート",
  description: "TypeScriptでソート（並び替え）を実装する方法について解説",
  createdAt: "2025-10-26",
  updatedAt: "2025-10-26",
  content: (
    <>
      <h2>ソートとは</h2>

      <p>
        ソートとはデータの順序を整える操作のことです。一般的には数値や文字列の配列を昇順または降順に並べ替えることを指します。
      </p>

      <p>TypeScriptではどのようにソートを実装できるか紹介します。</p>

      <CodeEditor
        title="ソートの実装例"
        defaultCode={`// 処理
function main(lines: string[]) {
  // スペース区切りの数値配列を取得
  const numbers = lines[0].split(" ").map(Number);

  // 昇順にソートして出力
  console.log(numbers.sort((a, b) => a - b).join(" "));
}

// 入力と実行
main(\`1 2 3 2 4 1 5 3 6\`.split("\\n"));`}
        height="250px"
      />

      <p>
        はい。組み込み実装があるので非常に簡単にソートが実装できます。実行環境や要件によっては他のアルゴリズムの方を使うこともありますが、基本的にはこの方法で十分です。
      </p>

      <h2>sort()メソッドについてもう少し詳しく</h2>

      <p>
        詳細は
        <MyLink
          href="https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/sort"
          opensNewTab
        >
          こちら
          <ExternalLink className="inline-block" size={14} />
        </MyLink>
        を参照してください。この中から個人的にためになった・具体的に覚えておいた方がいい点をいくつか紹介します。
      </p>

      <dl>
        <dt>デフォルトでは比較は文字列として行われる</dt>
        <dd>
          sort()に比較関数を渡さなくても実行できますが、デフォルトのソートでは文字列として比較されるため数値のソートでは意図しない結果になることがあります。比較関数を省略する場合は注意が必要です。
          <CodeEditor
            title="文字列として比較される例"
            defaultCode={`// 処理
function main2(lines: string[]) {
  // スペース区切りの数値配列を取得
  const numbers = lines[0].split(" ").map(Number);

  // 昇順にソートして出力（10の方が2よりも前に来る）
  console.log(numbers.sort().join(" "));
}

// 入力と実行
main2(\`1 2 3 2 4 10 5 3 6\`.split("\\n"));`}
            height="250px"
          />
          直感的には1,
          2...10の順番で並ぶことを期待しますが、文字列として比較されるため"10"が"2"よりも前に来てしまいます。辞書順というもので、"あ",
          "あい", "い"の順番に並ぶようなものです。
        </dd>

        <dt>基本的に昇順に並べ替えられる</dt>
        <dd>
          sort()に渡す比較関数は-1, 0,
          1のどれかを返す必要があります。結果としてどの順番で並ぶのか一見してわかりにくいですが、昇順として並び替えられると考えると-1が「aがbより前に来る」、1が「aがbより後に来る」と理解しやすいです。
          <CodeEditor
            title="比較関数の考え方"
            defaultCode={`// 処理
function main3(lines: string[]) {
  // スペース区切りの数値配列を取得
  const strs = lines[0].split(" ");

  // 文字列の長さをソートして出力（-1だとaがbよりも前に来る）
  console.log(strs.sort((a, b) => a.length < b.length ? -1 : 1).join(" "));
}

// 入力と実行
main3(\`banana apple kiwi strawberry\`.split("\\n"));`}
            height="250px"
          />
        </dd>

        <dt>元の配列が変更される</dt>
        <dd>
          sort()は元の配列を変更します。このことを忘れていると、バグの原因になることがあります。
          <CodeEditor
            title="元の配列が変更される例"
            defaultCode={`// 処理
function main4(lines: string[]) {
  // スペース区切りの数値配列を取得
  const numbers = lines[0].split(" ").map(Number);

  // 出力
  console.log("元の配列:", numbers);
  console.log("ソートした配列:", numbers.sort((a, b) => a - b));
  console.log("元の配列:", numbers); // 元の配列が変更されている
}

// 入力と実行
main4(\`1 2 3 2 4 1 5 3 6\`.split("\\n"));`}
            height="250px"
          />
          sort()だけでなくreverse()やsplice()などの配列操作関数も同様に元の配列を変更してしまいます。元の配列を保持したい場合はあらかじめコピーを作成しておくか、コピーメソッドを使用してください。
          <CodeEditor
            title="配列のコピーとコピーメソッド"
            defaultCode={`// 処理
function main5(lines: string[]) {
  // スペース区切りの数値配列を取得
  const numbers = lines[0].split(" ").map(Number);
  const numbersCopy = [...numbers]; // コピーを作成

  // 出力1
  console.log("# 配列のコピーを使った例");
  console.log("元の配列:", numbers);
  console.log("ソートした配列:", numbers.sort((a, b) => a - b));
  console.log("元の配列:", numbers); // 元の配列が変更されている
  console.log("コピーした配列:", numbersCopy); // コピーは変更されない

  // 出力2
  console.log("# コピーメソッドを使った例");
  console.log("元の配列:", numbers);
  console.log("降順にした配列:", numbers.toSorted((a, b) => b - a));
  console.log("元の配列:", numbers); // 元の配列が変更されない
}

// 入力と実行
main5(\`1 2 3 2 4 1 5 3 6\`.split("\\n"));`}
            height="450px"
          />
          ただし、配列をコピーするということはメモリを余分に消費することになるため、大量のデータを扱う場合は注意が必要です。一長一短ですね。
        </dd>
      </dl>

      <h2>まとめ</h2>

      <p>
        TypeScriptでソートを実装するには配列のsort()メソッドを使用します。比較関数を適切に指定することで数値や文字列の昇順・降順のソートが可能です。
        ただし、sort()メソッドは元の配列を変更したり、比較関数を省略すると意図しない結果になることがあるため注意が必要です。
        また、ソートの順番がどのような順番になるのかを正確に理解しておくと実装時に迷わなくて済むことでしょう。
      </p>
    </>
  ),
};
