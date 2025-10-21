import type { Metadata } from "next";
import { baseUrl } from "@/app/_lib/url";
import { CodeEditor } from "../_components/CodeEditor";
import { InPageLayout } from "../_components/InPageLayout";
import { algorithmPageTitle } from "../_lib/articles";
import { getPathToAlgorithmGettingStarted } from "./getPath";

const title = "はじめに";
const description = `${algorithmPageTitle} とは`;

export const metadata: Metadata = {
  title: `${title} | ${algorithmPageTitle} | kik4.work`,
  description: `${description} | TypeScriptでアルゴリズムを書く方法を実例コードと共に解説します。 | kik4.work - フロントエンドエンジニアkik4のサイト`,
  alternates: {
    canonical: `${baseUrl}${getPathToAlgorithmGettingStarted()}`,
  },
};

export default function Page() {
  return (
    <InPageLayout
      title={title}
      description={description}
      createdAt="2025-10-19"
      updatedAt="2025-10-21"
    >
      <h2>TypeScriptでアルゴリズムを書く</h2>

      <p>
        TypeScriptはJavaScriptに型システムを追加したプログラミング言語です。静的な型チェックにより、アルゴリズム実装時のバグを早期に発見でき、またデータ構造を明確に表現できます。
        JavaScriptのスーパーセットであるため、既存のJavaScriptエコシステムを活用しながら型安全性を得られることから、Webアプリケーションの開発に広く使われています。
      </p>

      <p>
        このサイトではTypeScriptを用いて、プログラミング問題を解くアルゴリズムの実装例を紹介していきます。
      </p>

      <p>
        TypeScriptを普段の業務で使っている方なら、使い慣れた言語でアルゴリズムを学ぶことで、学習のハードルを下げ、実践的なスキルとして定着させられます。
        TypeScriptの基本文法はすでに習得している前提で解説を進めるため、言語自体の学習が必要な方は、まず入門書などで基礎を学んでからご覧ください。
      </p>

      <h2>標準入力と標準出力</h2>

      <p>
        プログラミング問題の多くは標準入力からデータを受け取り、標準出力に結果を出力します。
        Webアプリケーションの開発ではあまり馴染みがないかもしれませんが、プログラミング問題では一般的な手法です。
      </p>

      <p>
        このサイトのオンライン実行環境では実際の標準入力は利用できませんが、競技プログラミングなどで使われる標準入力の形式を想定し、文字列として読み込む方法で実装します。
      </p>

      <CodeEditor
        title="入出力の例"
        defaultCode={`// 処理
function main(lines: string[]) {
  // 入力パターン: 各行がスペース区切りの数値
  for (const line of lines) {
    // split(" "): スペースで文字列を分割 → ["1", "2", "3"]
    // map(Number): 各要素を数値に変換 → [1, 2, 3]
    const numbers = line.split(" ").map(Number);
    
    // 配列の総和を計算して出力
    const total = sum(numbers);
    console.log(total);
  }
}

// 型注釈により、引数と戻り値の型を明示
function sum(numbers: number[]): number {
  let result = 0;
  for (const n of numbers) {
    result += n;
  }
  return result;
}

// 入力値
const input = \`1 2 3
4 5 6
7 8 9\`;

// 一行ずつ分割して入力値にし、実行
main(input.split("\\n"));`}
        height="550px"
      />

      <h2>注意事項</h2>

      <p>
        オンライン実行環境では自由にコードを実行できますが、ブラウザやシステムの動作に影響を与える可能性がありますので注意してください。
        特に無限ループや大量のメモリ消費を伴うコードの実行は注意してください。
      </p>
    </InPageLayout>
  );
}
