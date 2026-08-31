/**
 * 검색어와 일치하는 구간을 `<mark>`로 감쌉니다.
 * `mark`의 색은 tokens.css의 `--color-accent-bg`가 담당합니다.
 */
export function Highlighted({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;

  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: React.ReactNode[] = [];

  let from = 0;
  for (;;) {
    const at = lower.indexOf(needle, from);
    if (at < 0) break;
    if (at > from) parts.push(text.slice(from, at));
    parts.push(<mark key={at}>{text.slice(at, at + needle.length)}</mark>);
    from = at + needle.length;
  }
  if (parts.length === 0) return <>{text}</>;
  if (from < text.length) parts.push(text.slice(from));

  return <>{parts}</>;
}
