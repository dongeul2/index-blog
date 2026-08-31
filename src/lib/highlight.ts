/**
 * 최소 신택스 하이라이터.
 *
 * 디자인 시스템이 `--color-code-*` 토큰 8종을 정의하고 있으므로, 외부 라이브러리를
 * 들이는 대신 그 토큰 개수에 맞춘 규칙 기반 토크나이저를 둡니다. 정확한 파서가 아니라
 * 색을 입히기 위한 것이고, 지원 언어를 벗어나면 색 없이 그대로 렌더합니다.
 */

export type Token = { text: string; cls: string };

type Rule = { name: string; re: RegExp };

/** 순서가 곧 우선순위입니다. 주석·문자열이 항상 먼저 잡혀야 합니다. */
const RULES: Record<string, Rule[]> = {
  ts: [
    { name: "comment", re: /\/\/[^\n]*|\/\*[\s\S]*?\*\// },
    { name: "string", re: /`(?:\\[\s\S]|[^`\\])*`|'(?:\\[\s\S]|[^'\\\n])*'|"(?:\\[\s\S]|[^"\\\n])*"/ },
    {
      name: "keyword",
      re: /\b(?:import|export|from|default|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|async|await|new|class|extends|implements|type|interface|enum|as|of|in|try|catch|finally|throw|typeof|instanceof|satisfies|readonly|public|private|static)\b/,
    },
    { name: "builtin", re: /\b(?:console|window|document|Math|JSON|Promise|Object|Array|String|Number|Boolean|Set|Map|process|fetch)\b/ },
    { name: "const", re: /\b(?:true|false|null|undefined|NaN|Infinity)\b|\b0[xX][0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b/ },
    { name: "type", re: /\b[A-Z][A-Za-z0-9_]*\b/ },
    { name: "fn", re: /\b[a-zA-Z_$][\w$]*(?=\s*\()/ },
  ],
  yaml: [
    { name: "comment", re: /#[^\n]*/ },
    { name: "string", re: /'(?:[^'\n])*'|"(?:[^"\n])*"/ },
    { name: "keyword", re: /^[ \t]*-(?=\s)|^[ \t]*[\w.-]+(?=\s*:)/m },
    { name: "const", re: /\b(?:true|false|null|on|off|yes|no)\b|\b\d+(?:\.\d+)?\b/ },
    { name: "type", re: /\$\{\{[^}]*\}\}/ },
  ],
  bash: [
    { name: "comment", re: /#[^\n]*/ },
    { name: "string", re: /'(?:[^'])*'|"(?:\\[\s\S]|[^"\\])*"/ },
    { name: "keyword", re: /\b(?:if|then|fi|else|elif|for|in|do|done|while|case|esac|function|export|local|return)\b/ },
    { name: "builtin", re: /\b(?:npm|npx|node|git|cd|echo|curl|pnpm|yarn|mkdir|rm|cp|mv)\b/ },
    { name: "const", re: /\$[A-Za-z_][\w]*|\b\d+\b/ },
    { name: "fn", re: /(?:^|\s)--?[A-Za-z][\w-]*/ },
  ],
};

/** 언어 별칭 → 규칙 키 */
const ALIASES: Record<string, string> = {
  ts: "ts",
  tsx: "ts",
  js: "ts",
  jsx: "ts",
  javascript: "ts",
  typescript: "ts",
  json: "ts",
  yaml: "yaml",
  yml: "yaml",
  bash: "bash",
  sh: "bash",
  shell: "bash",
};

function tokenize(code: string, lang: string): Token[] {
  const rules = RULES[ALIASES[lang] ?? ""];
  if (!rules) return [{ text: code, cls: "" }];

  // 각 규칙을 캡처 그룹 하나로 감싸 합칩니다. 규칙 내부는 전부 non-capturing 이어야
  // 그룹 번호가 규칙 번호와 1:1로 맞습니다.
  const master = new RegExp(rules.map((r) => `(${r.re.source})`).join("|"), "gm");

  const out: Token[] = [];
  let last = 0;
  for (const m of code.matchAll(master)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: code.slice(last, at), cls: "" });
    const hit = m.slice(1, rules.length + 1).findIndex((g) => g !== undefined);
    out.push({ text: m[0], cls: hit >= 0 ? `tok-${rules[hit].name}` : "" });
    last = at + m[0].length;
  }
  if (last < code.length) out.push({ text: code.slice(last), cls: "" });
  return out;
}

/** 코드를 줄 단위 토큰 배열로 변환합니다. 줄 번호를 붙일 수 있도록 줄 경계를 유지합니다. */
export function highlightLines(code: string, lang: string): Token[][] {
  const lines: Token[][] = [[]];
  for (const tok of tokenize(code.replace(/\n+$/, ""), lang)) {
    const parts = tok.text.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part, cls: tok.cls });
    });
  }
  return lines;
}
