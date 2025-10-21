import type { Metadata } from "next";
import { baseUrl } from "@/app/_lib/url";
import { CodeEditor } from "../_components/CodeEditor";
import { InPageLayout } from "../_components/InPageLayout";
import { algorithmPageTitle } from "../_lib/articles";
import { getPathToAlgorithmBitsManipulation } from "./getPath";

const title = "ビット操作";
const description = `TypeScriptでビット操作を行う方法`;

export const metadata: Metadata = {
  title: `${title} | ${algorithmPageTitle} | kik4.work`,
  description: `${description} | TypeScriptでアルゴリズムを書く方法を紹介します。 | kik4.work - フロントエンドエンジニアkik4のサイト`,
  alternates: {
    canonical: `${baseUrl}${getPathToAlgorithmBitsManipulation()}`,
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
      <h2>TypeScriptでビット操作を行う</h2>

      <p>
        ビットとは、コンピュータが情報を扱う最小単位であり、0と1の二値で表現されます。ビット操作は、これらのビットに対して直接的な操作を行う手法であり、効率的なデータ処理やアルゴリズムの最適化に役立ちます。
      </p>

      <p>
        ここでは、TypeScriptを用いたビット操作の基本的な使い方を紹介します。
      </p>

      <h2>ビット列の表現</h2>

      <p>
        はじめのページに書いた通り入力は文字列で、ビット列を表現するならビットの0と1が連続したものです。例えば"1011"のような文字列をビット列として扱います。
        しかし文字列のままではビット操作ができません。ビット列は数値型に直して扱う必要があります。
      </p>

      <p>
        TypeScriptでは、parseInt関数を使ってビット列の文字列を対応する数値（number型）に変換できます。また、数値はtoString関数を使ってビット列の文字列に戻すことができます。
      </p>

      <CodeEditor
        title="ビット変換"
        defaultCode={`// 処理
function main(lines: string[]) {
  // ビット列の文字列を数値に変換
  const bits = parseInt(lines[0], 2);
  console.log(bits);

  // 数値をビット列の文字列に変換
  const str = bits.toString(2);

  // 先頭の0が消えるので入力値と長さを揃える
  const paddedStr = str.padStart(lines[0].length, "0");
  console.log(paddedStr);
}

// 入力と実行
main(\`01001010\`.split("\\n"));`}
        height="350px"
      />

      <h2>ビット列の使用例</h2>

      <p>
        ビット列を使用することで、効率的なデータ処理やアルゴリズムの実装が可能になります。以下に使用例を示します。
      </p>

      <p>
        AさんとBさんが0-9の数字の書かれたカードをそれぞれ持っているとします。同じ数字のカードを持っているかどうかを判定するために、ビット列を使用します。10枚のカードに対応する10ビットのビット列を用意し、各ビットがその数字のカードを持っているかどうかを示します。"1"はカードを持っていることを示し、"0"は持っていないことを示します。
      </p>

      <p>
        例えば、Aさんが{`{1, 3, 5, 9}`}
        のカードを持っている場合、左を0としてビット列は"0101010001"となります。同様に、Bさんが
        {`{2, 3, 6}`}
        のカードを持っている場合、ビット列は"0011001000"となります。
      </p>

      <p>
        AND演算を行えば、簡単に重複を判定できます。2つのビット列のANDを取って"0000000000"つまり数値型の0でない場合は、重複があることになります。
      </p>

      <CodeEditor
        title="重複の判定"
        defaultCode={`// 処理
function main(lines: string[]) {
  // ビット列に変換
  const bitsA = parseInt(lines[0], 2);
  const bitsB = parseInt(lines[1], 2);

  // 重複の判定
  const hasOverlap = (bitsA & bitsB) !== 0;
  console.log(hasOverlap);
}

// 入力と実行
main(\`0101010001
0011001000\`.split("\\n"));`}
        height="350px"
      />
    </InPageLayout>
  );
}
