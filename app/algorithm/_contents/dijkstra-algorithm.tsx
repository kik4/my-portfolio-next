import { MyLink } from "@/app/_components/MyLink";
import { getPathToDijkstra } from "@/app/dijkstra/getPath";
import { CodeEditor } from "../_components/CodeEditor";
import type { AlgorithmContent } from "../_lib/types";

export const dijkstraAlgorithm: AlgorithmContent = {
  slug: "dijkstra-algorithm",
  title: "ダイクストラ法",
  description: "TypeScriptでダイクストラ法を実装する方法について解説",
  createdAt: "2025-11-01",
  updatedAt: "2025-11-01",
  content: (
    <>
      <h2>ダイクストラ法とは</h2>

      <p>
        ダイクストラ法は、グラフ理論における最短経路問題を解決するための代表的なアルゴリズムです。
      </p>

      <p>
        点と点を結ぶ辺に距離（重み）が設定されたグラフが与えられたとき、スタートの点からゴールの点への最短経路を求めるアルゴリズムです。
        非負の重みを持つグラフに対して適用可能であり、効率的に最短経路を見つけることができます。（辺の重みが負だとそこを通れば無限に経路長をマイナスにできるため）
      </p>

      <p>
        理屈としては、最短経路の一部は最短経路である、という性質を利用しています。つまり、ある点までの最短経路が分かれば、その点からさらに他の点への最短経路も効率的に求められる、ということです。各点への最短経路を順々に見つけ、ゴールに到達するまで探索を続けます。
      </p>

      <p>
        ちなみに
        <MyLink href={getPathToDijkstra()}>
          ダイクストラ法を視覚的に理解するページ
        </MyLink>
        を作ったので、興味があればぜひ見てみてください。
      </p>

      <h2>ダイクストラ法の実装例</h2>

      <p>
        点の数をN、辺の数をMとします。点は1からNまでの番号が振られているとします。そして始点を1、終点をNとします。
        各辺は「始点、終点、重み」の3つの情報で表されます。今回は辺は双方向であるとします。
      </p>

      <CodeEditor
        title="ダイクストラ法の実装例"
        defaultCode={`// 実装
function main(lines: string[]) {
  // 入力の読み込み
  const [N, M] = lines[0].split(" ").map(Number);
  const edges: { from: number; to: number; weight: number }[] = [];
  for (let i = 1; i <= M; i++) {
    const [u, v, w] = lines[i].split(" ").map(Number);
    edges.push({ from: u, to: v, weight: w });
  }

  // 1からNへの最短距離データを設定（0は無視）
  const distance: { totalDistance: number, nodes: number[] }[] = Array(N+1).fill({ totalDistance: Infinity, nodes: [] });
  distance[1] = { totalDistance: 0, nodes: [1] };

  // 処理キューを作り、まずは始点の隣接点を追加
  const queue: { node: number; from: number; dist: number }[] = [];
  for (const edge of edges) {
    if (edge.from === 1) {
      queue.push({ node: edge.to, from: 1, dist: edge.weight });
    } else if (edge.to === 1) {
      queue.push({ node: edge.from, from: 1, dist: edge.weight });
    }
  }

  // 訪問した node を記録（ゴールに到達できない場合に早く打ち切るため）
  const visited = new Set<number>([1]);

  while (visited.size < N - 1) {
    // 距離が最小のノードを取り出す
    queue.sort((a, b) => a.dist - b.dist);
    const { node, dist, from } = queue.shift()!;

    // すでに訪問済みならスキップ
    if (visited.has(node)) {
      continue;
    }

    // 最短距離が更新されたら最短距離データを更新し、隣接点をキューに追加
    if (dist < distance[node].totalDistance) {
      distance[node] = { totalDistance: dist, nodes: [...distance[from].nodes, node] };

      // 訪問済みに追加
      visited.add(node);

      console.log(\`現在のノード: \${node}, 最短距離: \${dist}, 経路: \${distance[node].nodes.join(" -> ")}\`);

      // ゴールに到達したら終了
      if (node === N) {
        break;
      }

      // 隣接点をキューに追加
      queue.push(
        ...edges
          .filter((e) => e.from === node || e.to === node)
          .map((e) => {
            const nextNode = e.from === node ? e.to : e.from;
            return { node: nextNode, from: node, dist: dist + e.weight };
          }),
      );
    }
  }

  console.log(\`1から\${N}への最短距離: \${distance[N].totalDistance}, 経路: \${distance[N].nodes.join(" -> ")}\`);
}

// 入力と実行
main(\`6 9
1 2 7
1 3 9
1 6 14
2 3 10
2 4 15
3 4 11
3 6 2
4 5 6
5 6 9\`.split("\\n"));
`}
        height="750px"
      />

      <h2>まとめ</h2>

      <p>
        ここではダイクストラ法の基本的な考え方とTypeScriptでの実装例を紹介しました。ダイクストラ法は最短経路問題を解決するための強力なアルゴリズムであり、非常に有名なアルゴリズムの１つです。
      </p>

      <p>
        プログラミング問題集などでも頻出のアルゴリズムなので、ぜひ理解を深めて実装できるようにしておきましょう。
      </p>
    </>
  ),
};
