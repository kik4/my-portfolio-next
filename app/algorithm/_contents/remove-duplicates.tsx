import { CodeEditor } from "../_components/CodeEditor";
import type { AlgorithmContent } from "../_lib/types";

export const removeDuplicates: AlgorithmContent = {
  slug: "remove-duplicates",
  title: "重複の削除と検出/SetとMap",
  description:
    "配列やリストから重複要素を削除する方法や検出などのSetとMapの活用例",
  createdAt: "2025-10-25",
  updatedAt: "2025-10-25",
  content: (
    <>
      <h2>重複の削除とは</h2>

      <p>
        配列やリストから重複している要素を削除し一意な要素のみを残す処理はプログラミングでよく遭遇する課題です。データの正規化や集計処理の前処理などで頻繁に使用されます。
      </p>

      <p>
        TypeScriptではSetオブジェクトやループ処理など、複数の方法で重複を削除できます。ここではそれぞれの方法の特徴と使い分けについて解説します。
      </p>

      <h2>Setを使った重複削除</h2>

      <p>
        最もシンプルで効率的な方法はSetオブジェクトを使う方法です。Setは重複を許さないコレクションであり、自動的に重複要素を除外してくれます。
      </p>

      <CodeEditor
        title="Setによる重複削除"
        defaultCode={`// 処理
function main(lines: string[]) {
  // スペース区切りの数値配列を取得
  const numbers = lines[0].split(" ").map(Number);

  // Setに変換して重複を削除
  const uniqueNumbers = [...new Set(numbers)];

  console.log("元の配列:", numbers);
  console.log("重複削除後:", uniqueNumbers);
  console.log("要素数:", uniqueNumbers.length);
}

// 入力と実行
main(\`1 2 3 2 4 1 5 3 6\`.split("\\n"));`}
        height="400px"
      />

      <p>
        配列をSetに変換しスプレッド構文で再度配列に戻すことで簡潔に実装できます。
      </p>

      <p>
        Setは内部的にハッシュテーブルを使用しているため、O(n)の時間計算量で重複削除が可能です。つまり要素数に比例した実行時間で処理が行われます。これは効率的で、後で効率の悪い方法も紹介します。
      </p>

      <h2>文字列の重複削除</h2>

      <p>
        文字列から重複する文字を削除する場合も同様にSetを使用できます。文字列を配列に分割し、Setで重複を削除してから再度結合します。
      </p>

      <CodeEditor
        title="文字列の重複文字削除"
        defaultCode={`// 処理
function main2(lines: string[]) {
  const text = lines[0];

  // 文字列を文字の配列に分割してSetで重複削除
  const uniqueChars = [...new Set(text)];

  // 配列を文字列に結合
  const result = uniqueChars.join("");

  console.log("元の文字列:", text);
  console.log("重複削除後:", result);
}

// 入力と実行
main2(\`programming\`.split("\\n"));`}
        height="400px"
      />

      <p>
        文字列に対してSetを直接適用すると自動的に文字列が文字の配列として扱われます。スプレッド構文で展開しjoinで結合することで重複のない文字列を得られます。
      </p>

      <p>
        ちなみに文字列が文字の配列として扱われるという挙動はここでは便利ですが、場合によっては扱っているデータが配列なのか文字列なのか勘違いしやすいので注意が必要です。
      </p>

      <h2>より複雑な条件の重複削除</h2>

      <p>
        Setは単純な重複削除には適しています。しかし、実務ではより複雑な条件で重複を判定したい場合もあると思います。その場合にはMapオブジェクトの使用が有効です。Mapオブジェクトキーに重複判定の基準となるプロパティを設定し、値にオブジェクト全体を格納することで、重複削除が可能になります。
      </p>

      <CodeEditor
        title="オブジェクトの重複削除"
        defaultCode={`// ユーザー情報の型定義
type User = {
  id: number;
  name: string;
};

// ユーザー情報を作成
const users: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 1, name: "Alice" }, // 重複
  { id: 3, name: "Charlie" },
  { id: 2, name: "Bob" }, // 重複
];

// idをキーとしたMapで重複削除
const uniqueUsers = Array.from(
  new Map(users.map((user) => [user.id, user])).values()
);

console.log("元の配列:", users);
console.log("重複削除後:", uniqueUsers);`}
        height="450px"
      />

      <p>
        Mapオブジェクトはキーと値のペアを作成し、同じキーの要素は後から追加されたもので上書きされます。最後にvalues()で値のみを取り出して配列に変換しています。
      </p>

      <h2>filterを使った重複削除</h2>

      <p>
        ここで古い方法を紹介しますが、配列のfilterメソッドとindexOfを組み合わせることでも重複削除が可能です。この方法は、各要素が最初に出現する位置と現在のインデックスが一致するかを確認します。
      </p>

      <CodeEditor
        title="filterによる重複削除"
        defaultCode={`// 処理
function main4(lines: string[]) {
  const numbers = lines[0].split(" ").map(Number);

  // 最初に出現した位置のみを残す
  const uniqueNumbers = numbers.filter(
    (value, index, array) => array.indexOf(value) === index
  );

  console.log("元の配列:", numbers);
  console.log("重複削除後:", uniqueNumbers);
}

// 入力と実行
main4(\`5 3 7 3 9 5 2 7 1\`.split("\\n"));`}
        height="400px"
      />

      <p>
        この方法は実装は単純ですが、filterとindexOfで二度も配列全体を探索するためO(n²)の時間計算量になります。実際にはSetオブジェクトを使った方法（O(n)）を推奨します。もしもこのようなコードを見つけたら、上で紹介したようなSetを使う方法にリファクタリングすることを意識しましょう。
      </p>

      <h2>重複数のカウント</h2>

      <p>
        重複を削除するだけでなく、各要素の出現回数を知りたい場合などの複雑な処理にもMapを利用することができます。このようにMapは応用の効くオブジェクトのため、使い方を覚えておくと便利です。
      </p>

      <CodeEditor
        title="重複のカウント"
        defaultCode={`// 処理
function main5(lines: string[]) {
  const numbers = lines[0].split(" ").map(Number);

  // 各要素の出現回数をカウント
  const countMap = new Map<number, number>();
  for (const num of numbers) {
    countMap.set(num, (countMap.get(num) ?? 0) + 1);
  }

  console.log("元の配列:", numbers);
  console.log("出現回数:");
  for (const [num, count] of countMap) {
    console.log(\`\${num}: \${count}回\`);
  }

  // 2回以上出現した要素のみ抽出
  const duplicates = Array.from(countMap.entries())
    .filter(([_, count]) => count >= 2)
    .map(([num]) => num);

  console.log("\\n重複している要素:", duplicates);
}

// 入力と実行
main5(\`1 2 3 2 4 1 5 3 6 1\`.split("\\n"));`}
        height="550px"
      />

      <h2>まとめ</h2>

      <p>
        TypeScriptで重複を削除する方法について解説しました。基本的にはSetを使った方法が最もシンプルで効率的です。オブジェクトの配列やより複雑な条件での重複削除には、Mapを使った方法が適しています。
      </p>

      <p>
        また、重複の削除だけでなく出現回数のカウントなど様々な用途にMapを使うことができます。配列を扱う問題に直面した時にはMapの利用を検討することをお勧めします。
      </p>
    </>
  ),
};
