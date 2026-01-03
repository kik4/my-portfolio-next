export const formatCode = (content: string): string => {
  const formatted = content
    .split("\n")
    .map((line) => {
      // コメント行はそのまま
      if (line.trim().startsWith("#")) {
        return line.trim();
      }

      // タグ行をフォーマット: カンマの後にスペースを追加、余分なスペースを削除
      const joined = line
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .join(", ");

      // カンマで終わるようにする
      return joined ? `${joined},` : "";
    })
    .join("\n");

  // 空行を1つにまとめる（空白文字だけの行も含む）
  const reduced = formatted.replace(/(\n\s*){3,}/g, "\n\n");

  // 末尾の複数の空行を1つに削減
  return reduced.replace(/(\n\s*){2,}$/, "\n");
};
