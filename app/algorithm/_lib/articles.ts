import { getPathToAlgorithmBitsManipulation } from "../bits-manipulation/getPath";
import { getPathToAlgorithmDateObject } from "../date-object/getPath";
import { getPathToAlgorithmGettingStarted } from "../getting-started/getPath";
import type { Section } from "./types";

export const algorithmPageTitle = "TypeScriptでアルゴリズム";

export const sections: Section[] = [
  {
    id: "basics",
    title: "基礎",
    items: [
      { pathname: getPathToAlgorithmGettingStarted(), title: "はじめに" },
      { pathname: getPathToAlgorithmBitsManipulation(), title: "ビット操作" },
      { pathname: getPathToAlgorithmDateObject(), title: "Dateオブジェクト" },
    ],
  },
];
