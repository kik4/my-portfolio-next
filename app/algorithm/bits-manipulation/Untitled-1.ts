// 処理
function main(lines: string[]) {
  // ビット列に変換
  const bits = parseInt(lines[0], 2);
  console.log(bits);

  // 文字列に変換
  const str = bits.toString(2);

  // 先頭の0が消えるので入力値と長さを揃える
  const paddedStr = str.padStart(lines[0].length, "0");
  console.log(paddedStr);
}

// 入力値
const input = `01001010`;

// 実行
main(input.split("\n"));
