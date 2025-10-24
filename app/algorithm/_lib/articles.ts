import { twoDArrayYXProblem } from "../_contents/2d-array-yx-problem";
import { bitsManipulation } from "../_contents/bits-manipulation";
import { dateObject } from "../_contents/date-object";
import { gettingStarted } from "../_contents/getting-started";
import type { Section } from "./types";

export const sections: Section[] = [
  {
    id: "basics",
    title: "基礎",
    items: [gettingStarted, bitsManipulation, dateObject, twoDArrayYXProblem],
  },
];
