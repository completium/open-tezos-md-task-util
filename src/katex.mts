export const katexStyle = "https://cdn.jsdelivr.net/npm/katex@0.16.3/dist/katex.min.css"

export function hasKatex(content : string) : boolean {
  const inlineMathPattern = /\\\((?:[^\\]|\\.)+\\\)/;
  const displayMathPattern = /\$\$(?:[^\$]|\\.)+\$\$|\\\[.*?\\\]/;
  return inlineMathPattern.test(content) || displayMathPattern.test(content);
}