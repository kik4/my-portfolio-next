import { CodeEditor } from "../_components/CodeEditor";
import type { AlgorithmContent } from "../_lib/types";

export const priorityQueue: AlgorithmContent = {
  slug: "priority-queue",
  title: "優先度付きキュー（二分ヒープ）",
  description:
    "TypeScriptで優先度付きキューを二分ヒープで実装する方法について解説",
  createdAt: "2025-11-03",
  updatedAt: "2025-11-03",
  content: (
    <>
      <h2>優先度付きキューとは</h2>

      <p>
        優先度付きキューは、各要素に優先度が付与され、優先度の高い要素が先に処理されるデータ構造です。
        通常のキューは先入れ先出し（FIFO）ですが、優先度付きキューでは優先度に基づいて要素が取り出されます。
      </p>

      <p>
        言ってしまえば、普通のキューに優先順位の概念を追加しただけのものです。その実装方法は決まっていません。単に優先度の高い要素を線形探索で探す方法でもいいですし、もっと効率的な方法もあります。
      </p>

      <p>
        ここでは二分ヒープというデータ構造を使って優先度付きキューを実装する方法を解説します。
      </p>

      <h2>二分ヒープの実装例</h2>

      <p>
        二分ヒープとは、完全二分木（親は２つ以下の子を持つ）を用いて実装されたヒープの一種で、親ノードの値が子ノードの値よりも常に小さい（または大きい）という特性を持っています。
        この特性により、優先度付きキューの実装において効率的な要素の追加と取り出しが可能になります。
      </p>

      <p>
        木構造というと難しく感じるかもしれませんが、配列で表現できるので実装自体はシンプルです。木の根が配列の先頭でindexが0とすると、その子が1と2、1の子が3と4、2の子が5と6、3の子が7と8…という具合に規則的に並べていくことで、インデックスの計算で簡単に親や子を特定できます。
        また、配列なのでメモリの連続領域を利用できるため、キャッシュ効率が向上するというメリットがあります。
      </p>

      <p>
        挿入は配列の末尾に追加し、親ノードと比較して順序が保たれるまで入れ替えを繰り返します。最小値の取り出しは根ノードを取り出し、末尾の要素を根に移動させてから子ノードと比較し、順序が保たれるまで入れ替えを繰り返します。
      </p>

      <p>以下にTypeScriptでの実装例を示します。</p>

      <CodeEditor
        title="二分ヒープの実装例"
        defaultCode={`// 実装
class BinaryHeap<T> {
  private heap: T[] = [];

  constructor(private compareFunc: (a: T, b: T) => number) {}

  insert(value: T) {
    this.heap.push(value);
    this.bubbleUp();
  }

  extract(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const end = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.bubbleDown();
    }
    return min;
  }

  private bubbleUp() {
    let index = this.heap.length - 1;
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compareFunc(this.heap[parentIndex], element) <= 0) break;
      this.heap[index] = this.heap[parentIndex];
      index = parentIndex;
    }
    this.heap[index] = element;
  }

  private bubbleDown() {
    let index = 0;
    const element = this.heap[index];
    const length = this.heap.length;

    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let swapIndex: number | null = null;

      if (leftChildIndex < length) {
        if (this.compareFunc(this.heap[leftChildIndex], element) < 0) {
          swapIndex = leftChildIndex;
        }
      }
      if (rightChildIndex < length) {
        if (
          swapIndex === null ||
          this.compareFunc(this.heap[rightChildIndex], element) < 0
        ) {
          swapIndex = rightChildIndex;
        }
      }
      if (swapIndex === null) break;
      this.heap[index] = this.heap[swapIndex];
      index = swapIndex;
    }
    this.heap[index] = element;
  }

  toString(): string {
    return this.heap.toString();
  }
}

// 使用例
const pq = new BinaryHeap<number>((a, b) => a - b);
pq.insert(5);
pq.insert(3);
pq.insert(8);
console.log(pq.toString()); // "3,5,8"
console.log(pq.extract()); // 3
console.log(pq.toString()); // "5,8"
`}
        height="1450px"
      />

      <p>
        二分ヒープを実装した例です。insertメソッドで要素を追加し、extractメソッドで先頭の要素を取り出します。bubbleUpとbubbleDownメソッドでヒープの特性（親子の大小の整合性）を保つための調整を行っています。
      </p>

      <p>
        ジェネリクスと比較関数を用いることで、任意の型に対応した優先度付きキューを実現しています。使用例では最小値を優先するキューとして動作しています。出力結果から優先度付きキューとして正しく動作していることが確認できることでしょう。
      </p>

      <p>
        動作を見てわかる通り、この二分ヒープはどのような順で値を入れても最小値が優先して取り出せるデータ構造であり、優先度付きキューそのものとして機能します。
      </p>

      <h2>まとめ</h2>

      <p>
        優先度付きキューは、各要素に優先度が付与され、優先度の高い要素が先に処理されるデータ構造です。二分ヒープを用いることで、効率的な要素の追加と削除が可能な優先度付きキューを実現しています。
      </p>

      <p>
        上記のTypeScript実装例では、ジェネリクスと比較関数を用いることで、任意の型に対応した優先度付きキューを実現しました。比較関数を変更すれば最大値を優先する優先度付きキューにもなりますし、別のデータ型を扱うこともできます。試してみてください。
      </p>

      <p>
        この優先度付きキューは、タスクスケジューリングやイベント管理など、様々なアプリケーションで利用されます。他のデータ構造と組み合わせることで、より複雑なアルゴリズムの基盤としても活用できます。是非とも覚えておきたいですね。
      </p>
    </>
  ),
};
