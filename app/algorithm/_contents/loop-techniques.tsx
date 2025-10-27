import { CodeEditor } from "../_components/CodeEditor";
import type { AlgorithmContent } from "../_lib/types";

export const loopTechniques: AlgorithmContent = {
  slug: "loop-techniques",
  title: "様々なループの書き方",
  description:
    "TypeScriptで使える様々なループの書き方とその使い分けについて解説",
  createdAt: "2025-10-28",
  updatedAt: "2025-10-28",
  content: (
    <>
      <h2>TypeScriptの様々なループ</h2>

      <p>
        TypeScriptには配列やオブジェクトを反復処理するための様々なループの書き方があります。それぞれに特徴があり、用途に応じて使い分けることで、より読みやすく効率的なコードを書くことができます。
      </p>

      <h2>基本的なforループ</h2>

      <p>
        最も基本的なループで、初期化；条件；更新の3つの部分から成り立っています。インデックスを使って配列にアクセスできるため、配列の要素を変更したり、インデックスそのものを使った処理が必要な場合に便利です。
      </p>

      <CodeEditor
        title="基本的なforループ"
        defaultCode={`{
  // 基本的なforループ
  const numbers = [1, 2, 3, 4, 5];

  for (let i = 0; i < numbers.length; i++) {
    console.log(\`インデックス\${i}: \${numbers[i]}\`);
  }

  // 配列の要素を変更する例
  const arr = [1, 2, 3, 4, 5];
  for (let i = 0; i < arr.length; i++) {
    arr[i] = arr[i] * 2;
  }
  console.log("2倍にした配列:", arr);

  // 逆順にループする例
  for (let i = numbers.length - 1; i >= 0; i--) {
    console.log(\`逆順: \${numbers[i]}\`);
  }

  // 2つずつインクリメントする例
  for (let i = 0; i < 10; i += 2) {
    console.log(\`偶数インデックス: \${i}\`);
  }
}`}
        height="500px"
      />

      <p>
        C、C++、C#、Java…様々なプログラミング言語で同様のループ構文が存在するため、他の言語の学習者でも理解しやすいです。
      </p>

      <p>
        例のように、逆順にループしたりインクリメントの値を変更したり柔軟な使い方ができます。
        プログラミング問題では別々に与えられた配列の長さとデータを配列に変換するために頻出のループですが、実業務では配列がそのまま引数として利用されるのでこのループはあまり使われません。
        インデックスを0から始めるか1から始めるかなどの細かい調整が煩わしく、インデックスを直接操作できてしまうため、後述のループの方が好まれます。
      </p>

      <h2>for...ofループ</h2>

      <p>
        配列やiterableなオブジェクトの値を直接取得できるループです。インデックスが不要で値だけを使いたい場合に最適です。最も読みやすく、モダンなループの書き方の1つです。
      </p>

      <CodeEditor
        title="for...ofループ"
        defaultCode={`{
  // 基本的なfor...of
  const fruits = ["りんご", "バナナ", "オレンジ"];
  for (const fruit of fruits) {
    console.log(fruit);
  }

  // entriesを使ってインデックスも取得
  for (const [index, fruit] of fruits.entries()) {
    console.log(\`\${index}: \${fruit}\`);
  }

  // 文字列に対するfor...of
  const text = "Hello";
  for (const char of text) {
    console.log(char);
  }

  // Setに対するfor...of
  const uniqueNumbers = new Set([1, 2, 3, 4, 5]);
  for (const num of uniqueNumbers) {
    console.log(num);
  }

  // Mapに対するfor...of
  const userMap = new Map([
    ["user1", "Alice"],
    ["user2", "Bob"],
  ]);
  for (const [key, value] of userMap) {
    console.log(\`\${key}: \${value}\`);
  }
}`}
        height="600px"
      />

      <h2>for...inループ</h2>

      <p>
        オブジェクトのキーを反復処理するループです。紹介しますが推奨はしません。配列に対しても使えますが配列のインデックスが文字列として返されるため、配列には通常for...ofを使う方が適切です。
      </p>

      <CodeEditor
        title="for...inループ"
        defaultCode={`{
  // オブジェクトに対するfor...in
  const person = {
    name: "太郎",
    age: 25,
    city: "東京",
  };

  for (const key in person) {
    console.log(\`\${key}: \${person[key as keyof typeof person]}\`);
  }

  // 配列に対するfor...in（非推奨）
  const arr = ["a", "b", "c"];
  for (const index in arr) {
    console.log(\`インデックス\${index}（型: \${typeof index}）: \${arr[index]}\`);
  }
  // 注: インデックスが文字列として返される

  // Object.keysと組み合わせる方法
  const scores = {
    math: 85,
    english: 90,
    science: 78,
  };

  for (const subject of Object.keys(scores)) {
    console.log(\`\${subject}: \${scores[subject as keyof typeof scores]}点\`);
  }
    
  // 配列に対してインデックスと値を取得する場合はfor...ofとentriesを使う方が良い
  for (const [index, value] of arr.entries()) {
    console.log(\`インデックス\${index}（型: \${typeof index}）: \${value}\`);
  }
}`}
        height="650px"
      />

      <p>
        inとofで紛らわしく、上記のようにオブジェクトにもofを使うことができるのでofに統一した方が混乱しません。
      </p>

      <h2>forEachメソッド</h2>

      <p>
        配列の各要素に対して関数を実行するメソッドです。コールバック関数を使うため、関数型プログラミングのスタイルに適しています。ただし、breakやcontinueが使えない点に注意が必要です。
      </p>

      <CodeEditor
        title="forEachメソッド"
        defaultCode={`{
  // 基本的なforEach
  const numbers = [1, 2, 3, 4, 5];
  numbers.forEach((num) => {
    console.log(num * 2);
  });

  // インデックスと配列自体も取得可能
  const fruits = ["りんご", "バナナ", "オレンジ"];
  fruits.forEach((fruit, index, array) => {
    console.log(\`\${index}: \${fruit} (全\${array.length}個中)\`);
  });

  // オブジェクトの配列での使用例
  const users = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3, name: "Charlie" },
  ];

  users.forEach((user) => {
    console.log(\`ID: \${user.id}, Name: \${user.name}\`);
  });

  // 注意: breakできない
  console.log("\\nforEachではbreakできない例:");
  numbers.forEach((num) => {
    if (num === 3) {
      return; // この要素だけスキップ（continueのような動作）
    }
    console.log(num);
  });
  // 全ての要素が処理される
}`}
        height="650px"
      />

      <h2>whileループとdo...whileループ</h2>

      <p>
        条件を満たす間、繰り返し処理を実行するループです。配列の要素数が不明な場合や特定の条件が満たされるまで処理を続けたい場合に便利です。業務では避けますが、プログラミング問題ではwhile(true)のような無限ループから書き始めた方が考えやすいかもしれません。
      </p>

      <CodeEditor
        title="whileとdo...while"
        defaultCode={`{
  // 基本的なwhile
  let count = 0;
  while (count < 5) {
    console.log(\`カウント: \${count}\`);
    count++;
  }

  // 配列を使った例
  const items = [1, 2, 3, 4, 5];
  let index = 0;
  while (index < items.length) {
    console.log(\`アイテム: \${items[index]}\`);
    index++;
  }

  // do...while（最低1回は実行される）
  let num = 0;
  do {
    console.log(\`実行回数: \${num + 1}\`);
    num++;
  } while (num < 3);

  console.log("-----------------------");

  // 条件が最初から満たされない場合の違い
  console.log("whileの場合:");
  let x = 10;
  while (x < 5) {
    console.log("実行されない");
    x++;
  }

  console.log("do...whileの場合:");
  let y = 10;
  do {
    console.log("1回だけ実行される");
    y++;
  } while (y < 5);

  // 無限ループを避ける例
  let safeCount = 0;
  const maxIterations = 100;
  while (safeCount < maxIterations) {
    // 何らかの処理
    if (Math.random() > 0.95) {
      console.log(\`\${safeCount}回目で条件を満たした\`);
      break;
    }
    safeCount++;
  }
  if (safeCount === maxIterations) {
    console.log("最大反復回数に達しました");
  }
}`}
        height="1000px"
      />

      <h2>mapやfilter、reduceなどの配列メソッド</h2>

      <p>
        厳密にはループではありませんが、配列を反復処理する際によく使われるメソッドです。元の配列を変更せず新しい配列を返すため、関数型プログラミングのスタイルに適しています。モダンな環境ではこちらを見かけることがほとんどです。
      </p>

      <CodeEditor
        title="map、filter、reduceなど"
        defaultCode={`{
  const numbers = [1, 2, 3, 4, 5];

  // map: 各要素を変換
  const doubled = numbers.map((num) => num * 2);
  console.log("2倍:", doubled);

  // filter: 条件に合う要素だけ抽出
  const evens = numbers.filter((num) => num % 2 === 0);
  console.log("偶数:", evens);

  // reduce: 集計
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  console.log("合計:", sum);

  // メソッドチェーン
  const result = numbers
    .filter((num) => num > 2)
    .map((num) => num * 3)
    .reduce((acc, num) => acc + num, 0);
  console.log("2より大きい数を3倍して合計:", result);

  // some: いずれかの要素が条件を満たすか
  const hasLargeNumber = numbers.some((num) => num > 3);
  console.log("3より大きい数がある?:", hasLargeNumber);

  // every: 全ての要素が条件を満たすか
  const allPositive = numbers.every((num) => num > 0);
  console.log("全て正の数?:", allPositive);

  // find: 条件に合う最初の要素を取得
  const firstEven = numbers.find((num) => num % 2 === 0);
  console.log("最初の偶数:", firstEven);

  // findIndex: 条件に合う最初の要素のインデックス
  const firstEvenIndex = numbers.findIndex((num) => num % 2 === 0);
  console.log("最初の偶数のインデックス:", firstEvenIndex);
}`}
        height="700px"
      />

      <p>
        集計処理のreduceは非常に強力で、配列の要素を1つの値にまとめることができます。ただし複雑な処理を行う場合は可読性が低下することがあります。少しでも複雑な集計を行う場合は、for文を使うことを検討してください。
      </p>

      <h2>ループの使い分け</h2>

      <p>
        それぞれのループには適した使用場面があります。以下は私の考えるガイドラインです:
      </p>

      <ul>
        <li>
          <b>for...of</b>: シンプルで読みやすいので推奨。
        </li>
        <li>
          <b>基本的なfor</b>:
          インデックスが必要な場合や、配列を直接変更する場合。
        </li>
        <li>
          <b>forEach</b>:
          関数型プログラミングスタイルを好む場合。また、途中でループを抜ける必要がない場合。
        </li>
        <li>
          <b>map/filter/reduce</b>:
          新しい配列を作る、条件で絞り込む、集計する場合。mapとfilterは特に推奨。
        </li>
        <li>
          <b>while/do...while</b>:
          条件が満たされるまで繰り返す場合。無限ループに注意しなければならないため、業務ではあまり使わない。
        </li>
        <li>
          <b>for...in</b>: キーの列挙ができるが、紛らわしいので避けたい。
        </li>
      </ul>

      <CodeEditor
        title="パフォーマンス比較"
        defaultCode={`{
  // 大きな配列でのパフォーマンス比較
  const largeArray = Array.from({ length: 1000000 }, (_, i) => i);
  let sum = 0;

  // 基本的なfor
  console.time("基本的なfor");
  sum = 0;
  for (let i = 0; i < largeArray.length; i++) {
    sum += largeArray[i];
  }
  console.timeEnd("基本的なfor");
  console.log("合計:", sum);

  // for...of
  console.time("for...of");
  sum = 0;
  for (const num of largeArray) {
    sum += num;
  }
  console.timeEnd("for...of");
  console.log("合計:", sum);

  // forEach
  console.time("forEach");
  sum = 0;
  largeArray.forEach((num) => {
    sum += num;
  });
  console.timeEnd("forEach");
  console.log("合計:", sum);

  // reduce
  console.time("reduce");
  sum = largeArray.reduce((acc, num) => acc + num, 0);
  console.timeEnd("reduce");
  console.log("合計:", sum);
}`}
        height="700px"
      />

      <p>
        基本的なforが一般的に最も高速と言われていますが、いかがでしたでしょうか？個人的には速度よりもfor...ofやmap/filterを使う方が可読性が高くて好みです。
      </p>

      <h2>まとめ</h2>

      <p>
        TypeScriptには様々なループの書き方があり、それぞれに適した使用場面があります。
        パフォーマンスも重要ですが、多くの場合はコードの可読性や保守性の方が重要です。
        チームのコーディング規約や、処理の内容に応じて適切なループを選択しましょう。
      </p>

      <p>
        一般的には、配列の値だけを使う場合はfor...ofを、新しい配列を作る場合はmap/filterを使うことが推奨されます。
        パフォーマンスが重要な場合は基本的なforループを検討してください。
      </p>
    </>
  ),
};
