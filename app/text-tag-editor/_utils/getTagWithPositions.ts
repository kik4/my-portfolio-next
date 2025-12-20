import type { TagWithPosition } from "../page";

export const getTagWithPositions = (code: string): TagWithPosition[] => {
  const result: TagWithPosition[] = [];

  code.split("\n").forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;

    // コメント行をスキップ
    if (/^#.*$/.test(line)) {
      return;
    }

    // カンマ区切りでタグを抽出
    let currentPosition = 0;
    const parts = line.split(",");

    parts.forEach((part, partIndex) => {
      // 元の文字列での開始位置を計算
      const startColumn = currentPosition + 1; // Monaco は 1-indexed
      const trimmedTag = part.trim();

      if (trimmedTag) {
        // トリム前の部分文字列から、トリム後のタグの実際の位置を計算
        const trimStart = part.indexOf(trimmedTag);
        const actualStartColumn = startColumn + trimStart;
        const actualEndColumn = actualStartColumn + trimmedTag.length;

        result.push({
          tag: trimmedTag,
          lineNumber,
          startColumn: actualStartColumn,
          endColumn: actualEndColumn,
        });
      }

      // 次のパートのために位置を更新（カンマ分も含める）
      currentPosition += part.length + (partIndex < parts.length - 1 ? 1 : 0);
    });
  });

  return result;
};
