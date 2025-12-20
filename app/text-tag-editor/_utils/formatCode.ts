export const formatCode = (content: string): string => {
  return content
    .split("\n")
    .map((line) => {
      // コメント行はそのまま
      if (line.trim().startsWith("#")) {
        return line.trim();
      }

      // タグ行をフォーマット: カンマの後にスペースを追加、余分なスペースを削除
      return line
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .join(", ");
    })
    .join("\n");
};
