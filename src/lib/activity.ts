/**
 * 발행 리듬 — 순수 함수만. DB도 파일 시스템도 건드리지 않아 클라이언트에서도 안전합니다.
 *
 * `PostMeta.date`는 이미 `seoulDate()`로 KST YYYY-MM-DD 문자열입니다(§posts.ts). 그래서
 * 여기서 다시 시간대를 계산하지 않습니다 — 문자열을 UTC 자정으로 파싱해도 날짜 자체는
 * 이미 서울 기준으로 확정된 값이라 어긋나지 않습니다.
 */

export type WeeklyActivity = {
  /** 오래된 주 → 최근 주. 각 항목은 그 주(월요일 시작)에 발행한 글 수 */
  weeks: number[];
  thisMonth: number;
  thisYear: number;
  /** 연속 발행 주. 이번 주는 아직 끝나지 않았을 수 있어 0이어도 스트릭을 깨지 않습니다. */
  streakWeeks: number;
};

/** 그 날짜가 속한 주의 월요일. `YYYY-MM-DD` 문자열만 다루므로 UTC 자정으로 계산해도 안전합니다. */
function weekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=일 1=월 ... 6=토
  const diff = (day + 6) % 7; // 월요일까지 며칠 전인지
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function activityStats(
  posts: { date: string }[],
  weekCount = 12,
  today: string = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()),
): WeeklyActivity {
  const currentWeekStart = weekStart(today);

  // 최근 weekCount주의 시작일 — 오래된 것부터.
  const starts: string[] = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const d = new Date(`${currentWeekStart}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i * 7);
    starts.push(d.toISOString().slice(0, 10));
  }

  const counts = new Map(starts.map((s) => [s, 0]));
  let thisMonth = 0;
  let thisYear = 0;
  const monthPrefix = today.slice(0, 7);
  const yearPrefix = today.slice(0, 4);

  for (const p of posts) {
    if (p.date.startsWith(monthPrefix)) thisMonth++;
    if (p.date.startsWith(yearPrefix)) thisYear++;
    const ws = weekStart(p.date);
    if (counts.has(ws)) counts.set(ws, (counts.get(ws) ?? 0) + 1);
  }

  const weeks = starts.map((s) => counts.get(s) ?? 0);

  // 연속 발행 주 — 이번 주(마지막 항목)부터 거슬러 올라갑니다.
  // 이번 주가 0인 것만으로는 스트릭을 깨지 않습니다(아직 끝나지 않은 주이므로).
  let streakWeeks = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (i === weeks.length - 1 && weeks[i] === 0) continue;
    if (weeks[i] > 0) streakWeeks++;
    else break;
  }

  return { weeks, thisMonth, thisYear, streakWeeks };
}
