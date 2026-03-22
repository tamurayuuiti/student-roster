const RE_SPACE = /[\s　]+/g;
const RE_KATAKANA = /[\u30A1-\u30F6]/g;

export function normalizeText(str) {
  if (str == null) return "";

  let result = String(str)
    .normalize("NFKC")           // Unicode正規化
    .replace(RE_SPACE, " ")      // 空白を統一
    .trim();

  result = result.replace(RE_KATAKANA, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );

  return result.toLowerCase();
}