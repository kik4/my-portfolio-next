export interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  weight: number;
}

export interface DijkstraStep {
  visitedNodes: Set<string>;
  currentNode: string | null;
  distances: Map<string, number>;
  previousNodes: Map<string, string | null>;
  path: string[];
}

export type Mode =
  | "add-node"
  | "add-edge"
  | "delete"
  | "move"
  | "set-start"
  | "set-end";
