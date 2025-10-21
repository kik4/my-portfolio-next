import type { Metadata } from "next";
import { baseUrl } from "@/app/_lib/url";
import { CodeEditor } from "../_components/CodeEditor";
import { InPageLayout } from "../_components/InPageLayout";
import { algorithmPageTitle } from "../_lib/articles";
import { getPathToAlgorithmDateObject } from "./getPath";

const title = "Dateオブジェクト";
const description = `Dateオブジェクトを使ったシンプルな日付操作`;

export const metadata: Metadata = {
  title: `${title} | ${algorithmPageTitle} | kik4.work`,
  description: `${description} | TypeScriptでアルゴリズムを書く方法を紹介します。 | kik4.work - フロントエンドエンジニアkik4のサイト`,
  alternates: {
    canonical: `${baseUrl}${getPathToAlgorithmDateObject()}`,
  },
};

export default function Page() {
  return (
    <InPageLayout
      title={title}
      description={description}
      createdAt="2025-10-21"
      updatedAt="2025-10-21"
    >
      <article className="prose prose-blue dark:prose-invert max-w-none">
        <h1>Dateオブジェクトは使いにくい？</h1>

        <p>
          TypeScript/JavaScriptの組み込みオブジェクトであるDateオブジェクトは、日付や時刻を扱うための基本的な機能を提供します。
          しかし、そのAPIは直感的でない部分が多く、特にタイムゾーンの扱いや月のインデックスが0から始まる点など、初心者にとって混乱を招くことがあります。
        </p>

        <p>
          実際の業務においてもDateオブジェクトの扱いに苦労することが多く、より使いやすい日付操作ライブラリ（例:
          date-fnsやdayjs）が広く利用されています。いえ、基本的にこれらのライブラリを使っている現場がほとんどでしょう。
        </p>

        <p>
          しかし、そもそも日時操作自体が複雑であり、またライブラリを使う場合でもDateオブジェクトの基礎的な理解は重要です。
          ここではDateオブジェクトを使ったシンプルな日付操作について解説します。
        </p>

        <h2>タイムゾーンの考え方</h2>

        <p>
          Dateオブジェクトを扱う上で最も悩まされるのはタイムゾーンの理解です。特にブラウザで動作するjavaScriptでは、Dateオブジェクトは常に実行環境のローカルタイムゾーンを基準に動作します。
          すなわち、ユーザーのPCの設定によってDateオブジェクトの振る舞いが変わる可能性があります。
        </p>

        <p>
          「うちのサイトは日本のユーザーが多いので問題にならない」……そう思うかもしれませんが、あるユーザーは海外からアクセスしているかもしれません。また、サーバーサイドで動作する場合も、サーバーのタイムゾーン設定によって結果が変わる可能性があります。
          つまり、Dateオブジェクトを使う際は常にタイムゾーンの影響を考慮する必要があります。
        </p>

        <p>では、どのように気を付ければよいのでしょうか？</p>

        <p>
          実のところ、Dateオブジェクトの持つ日時の実態は1970年1月1日午前0時(UTC)からのミリ秒を表す整数値でしかありません。そしてこの整数値はタイムゾーンに依存しません。日本であってもアメリカであっても同じ値です。
          ということは、Dateオブジェクトを生成する際に常にUTCとして扱うことで、タイムゾーンの影響を受けずに一貫した日時操作が可能になります。
        </p>

        <CodeEditor
          title="タイムゾーンの扱い"
          defaultCode={`const now = new Date();

// タイムゾーンで値が変わる
console.log("ローカル時刻:", now.toString());

// 以下の値はどのタイムゾーンでも同じ
console.log("1970年1月1日午前0時(UTC)からのミリ秒:", now.getTime());
console.log("UTC時刻:", now.toISOString());

// UTCに+9時間することで日本標準時に変換
const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)

// 日本標準時を独自フォーマットで表示
const jstString = jst.toISOString()
console.log("JST日時:", jstString.slice(0,10).replaceAll("-", "/"), jstString.slice(11,16));`}
          height="350px"
        />

        <p>
          上記のコード例では、現在日時を取得し、UTCとして扱うことで一貫した日時操作を行っています。
          getTime()メソッドおよびtoISOString()メソッドはタイムゾーンに依存しないため、常に同じ結果が得られます。
          特にtoISOString()メソッドは、UTC時刻をISO
          8601形式の文字列で返すため、簡単な文字列操作で日付と時刻を分割して取り出したり、独自フォーマットで表示したりすることができます。
        </p>

        <h2>シンプルな時刻の操作</h2>

        <p>
          ではここで、Dateオブジェクトを使ってシンプルな時刻操作を行う例を見てみましょう。
        </p>

        <p>
          指定された時刻に指定された分数を加算し、新しい時刻を表示するという処理について考えます。
          分は0-59の範囲で、60分を超える場合は時間に繰り上げる必要があります。時間は0-23の範囲で、24時間を超える場合は日付に繰り上げる必要があります。
          数値型で扱うには複雑ですね。しかしDateオブジェクトを使うと簡単に実装できます。
        </p>

        <p>
          このサイトでは入力は文字列です。基準の時刻は"HH:MM"の形式で与えられると仮定します。文字列を時刻に変換するにも、ISO
          8601形式の文字列を使うと簡単です。
        </p>

        <CodeEditor
          title="時刻の加算"
          defaultCode={`// 処理
function main(lines: string[]) {
  const time = lines[0];
  const addMinutes = Number(lines[1]);

  // "HH:MM"形式の文字列をISO 8601形式に変換してDateオブジェクトを生成
  const date = new Date(\`1970-01-01T\${time}:00Z\`);

  // 分を加算
  const newTime = new Date(date.getTime() + addMinutes * 60 * 1000);

  // 結果を"HH:MM"形式で表示
  console.log(newTime.toISOString().slice(11,16));
}

// 入力
const input = \`19:25
40\`;

// 実行
main(input.split("\\n"));`}
          height="450px"
        />
      </article>
    </InPageLayout>
  );
}
