import type { DijkstraStep, Edge, Node } from "./types";

export function dijkstra(
  nodes: Node[],
  edges: Edge[],
  startId: string,
  endId: string,
): DijkstraStep[] {
  const steps: DijkstraStep[] = [];
  const distances = new Map<string, number>();
  const previousNodes = new Map<string, string | null>();
  const unvisited = new Set<string>();
  const visited = new Set<string>();

  // 初期化
  for (const node of nodes) {
    distances.set(node.id, node.id === startId ? 0 : Number.POSITIVE_INFINITY);
    previousNodes.set(node.id, null);
    unvisited.add(node.id);
  }

  // 隣接リストを構築
  const adjacency = new Map<
    string,
    Array<{ nodeId: string; weight: number }>
  >();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) {
      adjacency.set(edge.from, []);
    }
    if (!adjacency.has(edge.to)) {
      adjacency.set(edge.to, []);
    }
    adjacency.get(edge.from)?.push({ nodeId: edge.to, weight: edge.weight });
    adjacency.get(edge.to)?.push({ nodeId: edge.from, weight: edge.weight });
  }

  while (unvisited.size > 0) {
    // 未訪問の中で最小距離のノードを選択
    let currentNode: string | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;
      if (dist < minDistance) {
        minDistance = dist;
        currentNode = nodeId;
      }
    }

    if (currentNode === null || minDistance === Number.POSITIVE_INFINITY) {
      break;
    }

    unvisited.delete(currentNode);
    visited.add(currentNode);

    // ステップを記録
    steps.push({
      visitedNodes: new Set(visited),
      currentNode,
      distances: new Map(distances),
      previousNodes: new Map(previousNodes),
      path: [],
    });

    // 終点に到達したら終了
    if (currentNode === endId) {
      break;
    }

    // 隣接ノードの距離を更新
    const neighbors = adjacency.get(currentNode) || [];
    for (const { nodeId, weight } of neighbors) {
      if (visited.has(nodeId)) continue;

      const currentDistance = distances.get(currentNode) ?? 0;
      const newDistance = currentDistance + weight;
      const existingDistance =
        distances.get(nodeId) ?? Number.POSITIVE_INFINITY;

      if (newDistance < existingDistance) {
        distances.set(nodeId, newDistance);
        previousNodes.set(nodeId, currentNode);
      }
    }
  }

  // 最短経路を再構築
  const path: string[] = [];
  let current: string | null = endId;

  while (current !== null) {
    path.unshift(current);
    if (current === startId) break;
    current = previousNodes.get(current) || null;
  }

  // 最終ステップに経路を追加
  if (steps.length > 0) {
    steps[steps.length - 1].path = path;
  }

  return steps;
}
