/** `2024-11-01` → `2024.11`. 끝이 없으면 「진행 중」. 순수 함수 — 클라이언트에서도 씁니다. */
export function formatPeriod(start: string | null, end: string | null, ongoing = "진행 중"): string {
  const ym = (iso: string) => `${iso.slice(0, 4)}.${iso.slice(5, 7)}`;
  if (!start) return end ? ym(end) : "";
  if (end && ym(end) === ym(start)) return ym(start);
  return `${ym(start)} – ${end ? ym(end) : ongoing}`;
}

/** 기간 길이 — 「4년 1개월」. 끝이 없으면 `now`까지 */
export function periodLength(start: string, end: string | null, now: Date = new Date()): string {
  const s = new Date(start);
  const e = end ? new Date(end) : now;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y > 0 ? `${y}년` : "", m > 0 ? `${m}개월` : ""].filter(Boolean).join(" ") || "1개월";
}
