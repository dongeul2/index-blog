/**
 * 이름에서 주소용 슬러그를 만듭니다. 사람이 슬러그를 직접 쓰지 않게 하기 위한 것입니다.
 * 한글처럼 라틴 문자가 없는 이름은 짧은 무작위 꼬리를 붙인 `p-xxxxx`가 됩니다 — 주소는
 * 바뀌지 않는 식별자일 뿐이고, 화면에는 언제나 이름이 보입니다.
 */
export function toSlug(name: string, prefix = "p"): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return base || `${prefix}-${Math.random().toString(36).slice(2, 7)}`;
}

/** `taken`에 없을 때까지 -2, -3을 붙입니다 */
export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}
