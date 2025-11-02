import { twoDArrayYXProblem } from "../_contents/2d-array-yx-problem";
import { binarySearch } from "../_contents/binary-search";
import { bitsManipulation } from "../_contents/bits-manipulation";
import { dateObject } from "../_contents/date-object";
import { dijkstraAlgorithm } from "../_contents/dijkstra-algorithm";
import { gettingStarted } from "../_contents/getting-started";
import { knapsackProblem } from "../_contents/knapsack-problem";
import { loopTechniques } from "../_contents/loop-techniques";
import { priorityQueue } from "../_contents/priority-queue";
import { removeDuplicates } from "../_contents/remove-duplicates";
import { sortAlgorithm } from "../_contents/sort-algorithm";
import { sortMethod } from "../_contents/sort-method";
import type { Section } from "./types";

export const sections: Section[] = [
  {
    id: "basics",
    title: "基礎",
    items: [
      gettingStarted,
      bitsManipulation,
      dateObject,
      twoDArrayYXProblem,
      removeDuplicates,
      sortMethod,
      sortAlgorithm,
      loopTechniques,
    ],
  },
  {
    id: "algorithms",
    title: "アルゴリズム",
    items: [dijkstraAlgorithm, binarySearch, priorityQueue, knapsackProblem],
  },
];
