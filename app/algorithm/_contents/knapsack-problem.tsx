import { CodeEditor } from "../_components/CodeEditor";
import type { AlgorithmContent } from "../_lib/types";

export const knapsackProblem: AlgorithmContent = {
  slug: "knapsack-problem",
  title: "ナップサック問題",
  description: "TypeScriptでナップサック問題を解決する方法について解説",
  createdAt: "2025-11-04",
  updatedAt: "2025-11-04",
  content: (
    <>
      <h2>ナップサック問題とは</h2>

      <p>
        ナップサック問題は、ナップサックに入れる荷物の組み合わせを考える問題です。
        それぞれの荷物には重さと価値が設定されており、ナップサックの容量制限を超えずに最も価値のある組み合わせを見つける問題です。
        （ちなみに特定の荷物を複数回選ぶことはできないこととします。この制約がある場合を特に「0-1ナップサック問題」と呼びます）
      </p>

      <p>
        単純な問題に思えますが「組み合わせ」という言葉が示す通り、荷物の数が増えれば増えるほどに選択肢が爆発に増加し、全てのパターンを試すのが非常に困難になります。
        そのため、効率的に最適解を見つけるアルゴリズムが求められます。
      </p>

      <p>
        これは最適化問題の一例であり、動的計画法などを用いて解決されることが一般的です。
      </p>

      <h2>全ての組み合わせを試す</h2>

      <p>
        問題を見て最初に思い付くのが単純に全ての組み合わせを試す方法でしょう。ひとまず、配列を再帰的に組み合わせていく方法を考えてみます。
      </p>

      <p>
        入力の一行目がナップサックの容量制限と荷物の数、続く行が各荷物の価値と重さを表す形式とします。
      </p>

      <p>
        サンプルコードでは容量制限5のナップサックに対して、三種類の荷物を考えます。荷物はそれぞれ（価値:
        6, 重さ: 2）、（価値: 10, 重さ: 3）、（価値: 12, 重さ: 4）です。
      </p>

      <CodeEditor
        title="全ての組み合わせを試す実装例（再帰）"
        defaultCode={`{
  type Item = { id: number; value: number; weight: number };

  // 実装
  function maxValueCombRecursive(
    W: number,
    items: Item[],
  ): { maxValue: number; combination: Item[] } {
    let maxValue = 0;
    let maxCombination: Item[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rest = W - item.weight;
      if (rest < 0) continue;
      // itemを選んだ場合の残りの荷物の最適解を再帰的に計算
      const result = maxValueCombRecursive(rest, [
        ...items.slice(0, i),
        ...items.slice(i + 1),
      ]);
      const newValue = result.maxValue + item.value;
      const newComb = [item, ...result.combination];
      console.log(newComb); // このステップで選ばれた荷物の組み合わせを表示
      // 最大価値の更新
      if (maxValue < newValue) {
        maxValue = newValue;
        maxCombination = newComb;
      }
    }
    return { maxValue, combination: maxCombination };
  }

  /* 以下、入力と実行 */

  function main(lines: string[]) {
    // 入力のパース
    const [W, N] = lines[0].split(" ").map(Number);
    const items: Item[] = [];
    for (let i = 0; i < N; i++) {
      const [value, weight] = lines[i + 1].split(" ").map(Number);
      items.push({ id: i + 1, value, weight });
    }

    const result = maxValueCombRecursive(W, items);

    // 出力
    console.log("最大価値:", result.maxValue);
    console.log(
      "選ばれた荷物:",
      result.combination.map(
        (item) => \`(ID: \${item.id}, 価値: \${item.value}, 重さ: \${item.weight})\`,
      ),
    );
  }

  main(
  \`5 3
6 2
10 3
12 4\`.split("\\n"),
  );
}
`}
        height="650px"
      />

      <p>
        ビット演算を用いて全ての組み合わせを列挙する方法もあります。再帰的な方法よりもコードがシンプルになる場合があります。
      </p>

      <CodeEditor
        title="全ての組み合わせを試す実装例"
        defaultCode={`{
  type Item = { id: number; value: number; weight: number };

  // 実装
  function maxValueCombBit(
    W: number,
    items: Item[],
  ): { maxValue: number; combination: Item[] } {
    const N = items.length;
    let maxValue = 0;
    let maxCombination: Item[] = [];
    // 全ての組み合わせをビットで列挙
    for (let bit = 0; bit < 1 << N; bit++) {
      let totalWeight = 0;
      let totalValue = 0;
      const selectedItems: Item[] = [];
      // ビットに対応する荷物を選択
      for (let i = 0; i < N; i++) {
        if (bit & (1 << i)) {
          totalWeight += items[i].weight;
          totalValue += items[i].value;
          selectedItems.push(items[i]);
        }
      }
      console.log(selectedItems); // このステップで選ばれた荷物の組み合わせを表示
      // 重さが制限内で価値が最大なら更新
      if (totalWeight <= W && totalValue > maxValue) {
        maxValue = totalValue;
        maxCombination = selectedItems;
      }
    }
    return { maxValue, combination: maxCombination };
  }

  /* 以下、入力と実行 */

  function main(lines: string[]) {
    // 入力のパース
    const [W, N] = lines[0].split(" ").map(Number);
    const items: Item[] = [];
    for (let i = 0; i < N; i++) {
      const [value, weight] = lines[i + 1].split(" ").map(Number);
      items.push({ id: i + 1, value, weight });
    }

    const result = maxValueCombBit(W, items);

    // 出力
    console.log("最大価値:", result.maxValue);
    console.log(
      "選ばれた荷物:",
      result.combination.map(
        (item) => \`(ID: \${item.id}, 価値: \${item.value}, 重さ: \${item.weight})\`,
      ),
    );
  }

  // 入力と実行
  main(
  \`5 3
6 2
10 3
12 4\`.split("\\n"),
  );
}
`}
        height="650px"
      />

      <p>
        どちらも正しい解法です。しかし、荷物の数を増やしてみるとステップ数が一気に増えます。全ての組み合わせを試すというのが実用的ではないことは直感的にわかるでしょう。
      </p>

      <h2>動的計画法を用いた解法</h2>

      <p>ナップサック問題を効率的に解くために、動的計画法を用いましょう。</p>

      <p>
        基本的な考え方は小さな部分問題の解を組み合わせて大きな問題の解を導くことです。ナップサック問題では、縦軸に荷物、横軸に容量の表を作成し、各セルにその時点での最大価値を記録していきます。
      </p>

      <p>
        具体的には左上から右下へ各マスを埋めていきます。各マスについて、その荷物を入れない場合と入れる場合の価値を比較し、より大きい方を採用します。入れない場合は１つ上のマスの値をコピー、入れる場合はその荷物の価値＋残りの容量に対応する左側のマスの値を足したものになります。
      </p>

      <table className="mt-2 **:border-gray-600 dark:**:border-white [&_td]:border [&_td]:px-4 [&_td]:py-2 [&_th]:border [&_th]:px-4">
        <thead className="text-sm">
          <tr>
            <th>容量</th>
            <th>0</th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>荷物なし</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
          </tr>
          <tr>
            <td>荷物1（価値6 重さ2）</td>
            <td>0</td>
            <td>0</td>
            <td>6</td>
            <td>6</td>
            <td>6</td>
            <td>6</td>
          </tr>
          <tr>
            <td>荷物2（価値10 重さ3）</td>
            <td>0</td>
            <td>0</td>
            <td>6</td>
            <td>10</td>
            <td>10</td>
            <td>16</td>
          </tr>
          <tr>
            <td>荷物3（価値12 重さ4）</td>
            <td>0</td>
            <td>0</td>
            <td>6</td>
            <td>10</td>
            <td>12</td>
            <td>16</td>
          </tr>
        </tbody>
      </table>

      <p>
        例えば荷物2の容量4のマスを埋める時は、入れない場合は上のマスの値6、入れる場合は荷物2の価値10＋残りの容量1のマスの値0で合計10となり、より大きい10の値を採用します。
      </p>

      <p>
        次の荷物2の容量5のマスを埋める時は、入れない場合は上のマスの値6、入れる場合は荷物2の価値10＋残りの容量2のマスの値6で合計16となり、より大きい16の値を採用します。
      </p>

      <p>
        こうすれば表の各マスにその時点での最大価値が記録され、最終的に右下のセルに最大価値が得られます。この方法なら全ての組み合わせを試す必要が無く、計算量は表の各マスを埋めるO(荷物の数×容量)で済みますね。
      </p>

      <p>以下にTypeScriptでの実装例を示します。</p>

      <CodeEditor
        title="動的計画法での実装例"
        defaultCode={`{
  type Item = { id: number; value: number; weight: number };

  // 実装
  function maxValueCombDP(
    W: number,
    items: Item[],
  ): { maxValue: number; combination: Item[] } {
    // DP表の初期化
    const N = items.length;
    const table: { value: number; items: Item[] }[][] = Array.from(
      { length: N + 1 },
      () =>
        Array(W + 1)
          .fill(0)
          .map(() => ({ value: 0, items: [] })),
    );

    // 動的計画法で表を埋める
    for (let i = 1; i <= N; i++) {
      const item = items[i - 1];
      for (let w = 0; w <= W; w++) {
        if (item.weight > w) {
          table[i][w] = table[i - 1][w]; // 入れない場合
        } else {
          // 入れる場合と入れない場合の最大値を比較
          const withoutItem = table[i - 1][w];
          const withItem = {
            value: table[i - 1][w - item.weight].value + item.value,
            items: [...table[i - 1][w - item.weight].items, item],
          };
          if (withItem.value > withoutItem.value) {
            table[i][w] = withItem;
          } else {
            table[i][w] = withoutItem;
          }
        }
      }
      // DP表の状態を表示
      console.log(
        \`荷物\${i}まで考慮した場合のDP表:\`,
        table[i].map((cell) => cell.value),
      );
    }

    return { maxValue: table[N][W].value, combination: table[N][W].items };
  }

  /* 以下、入力と実行 */

  function main(lines: string[]) {
    // 入力のパース
    const [W, N] = lines[0].split(" ").map(Number);
    const items: Item[] = [];
    for (let i = 0; i < N; i++) {
      const [value, weight] = lines[i + 1].split(" ").map(Number);
      items.push({ id: i + 1, value, weight });
    }

    const result = maxValueCombDP(W, items);

    // 出力
    console.log("最大価値:", result.maxValue);
    console.log(
      "選ばれた荷物:",
      result.combination.map(
        (item) => \`(ID: \${item.id}, 価値: \${item.value}, 重さ: \${item.weight})\`,
      ),
    );
  }

  // 入力と実行
  main(
  \`5 3
6 2
10 3
12 4\`.split("\\n"),
  );
}
`}
        height="750px"
      />

      <p>
        上のマスと左のマスを参照するという、一度計算した部分問題の解を再利用を行っています。こうすることで、全ての組み合わせを試す方法に比べて大幅に効率化できることがわかります。
      </p>

      <h2>上記の解法の問題</h2>

      <p>
        ところで、上記の動的計画法による解法には問題点があることに気付きましたか？
      </p>

      <p>
        １つ目は、メモリ使用量が大きくなる可能性があることです。特に荷物の数や容量が大きくなると、DP表のサイズも大きくなり、メモリを大量に消費することになります。
      </p>

      <p>
        ２つ目は、容量や重さが整数でなければならないことです。でなければ事前に表を作れません。
      </p>

      <p>
        画期的な解法に思えましたが万能ではありません。ナップサック問題には他にも様々な解法が提案されており、問題の特性に応じて適切なアルゴリズムを選択することが重要です。
      </p>

      <h2>まとめ</h2>

      <p>
        ナップサック問題は組み合わせ最適化問題の一例であり、全ての組み合わせを試す方法では計算量が爆発的に増加するため、動的計画法などの効率的なアルゴリズムが求められます。
      </p>

      <p>
        TypeScriptでの実装例を通じて、ナップサック問題の基本的な解法とその限界について理解できたかと思います。実際の問題に取り組む際には、問題の特性に応じて最適なアルゴリズムを選択し、効率的な解決策を見つけることが重要です。
      </p>

      <p>
        今回の実装例を参考に、ナップサック問題に挑戦してみてください。最適な解法を見つけるために、様々なアプローチを試すことが重要です。
      </p>
    </>
  ),
};
