/**
 * 네 가지 역할 — 이 포트폴리오의 색 체계이자, 커밋 기록을 읽는 기준.
 *
 * 커밋 메시지가 Conventional Commits를 따르므로 접두어로 그 커밋이 어떤 일이었는지
 * 가를 수 있습니다. 완벽한 분류는 아니지만(기능 커밋 안에도 테스트가 있습니다) 같은 규칙을
 * 모든 프로젝트에 똑같이 적용하므로 비율의 비교에는 충분합니다. 순수 함수만 둡니다.
 */

export type Role = "plan" | "dev" | "qa" | "ops";

export const ROLES: Role[] = ["plan", "dev", "qa", "ops"];

export const ROLE_LABEL: Record<Role, string> = {
  plan: "기획",
  dev: "개발",
  qa: "QA",
  ops: "운영",
};

/** 화면에 보이는 「어떤 커밋을 어디로 셌는지」 설명 — 차트 옆 범례와 같은 내용 */
export const ROLE_RULE: Record<Role, string> = {
  plan: "docs",
  dev: "feat · refactor · perf · style",
  qa: "test · fix",
  ops: "ci · build · chore",
};

const TYPE_ROLE: Record<string, Role> = {
  docs: "plan",
  feat: "dev",
  refactor: "dev",
  perf: "dev",
  style: "dev",
  test: "qa",
  fix: "qa",
  ci: "ops",
  build: "ops",
  chore: "ops",
};

/** `feat(home)!: …` → dev. 규칙을 따르지 않은 메시지는 null(세지 않음) */
export function roleOf(message: string): Role | null {
  const m = message.match(/^([a-z]+)(\([^)]*\))?!?:\s/i);
  return m ? (TYPE_ROLE[m[1].toLowerCase()] ?? null) : null;
}

export type RoleCounts = Record<Role, number>;
export const ZERO: RoleCounts = { plan: 0, dev: 0, qa: 0, ops: 0 };

export function countRoles(messages: string[]): RoleCounts {
  const c = { ...ZERO };
  for (const msg of messages) {
    const r = roleOf(msg);
    if (r) c[r]++;
  }
  return c;
}

/** 합이 100이 되는 정수 비율(최대 잔여법) — 막대·범례의 숫자가 서로 어긋나지 않게 */
export function toPercent(c: RoleCounts): RoleCounts {
  const total = ROLES.reduce((n, r) => n + c[r], 0);
  if (total === 0) return { ...ZERO };
  const raw = ROLES.map((r) => ({ r, v: (c[r] / total) * 100 }));
  const out = { ...ZERO };
  let left = 100;
  for (const { r, v } of raw) {
    out[r] = Math.floor(v);
    left -= out[r];
  }
  raw
    .sort((a, b) => (b.v % 1) - (a.v % 1))
    .slice(0, left)
    .forEach(({ r }) => out[r]++);
  return out;
}

export type MonthRoles = { month: string } & RoleCounts;

/** 커밋 → 달별 역할 수. 비어 있는 달도 0으로 채워 시간축이 끊기지 않게 합니다 */
export function byMonth(commits: { message: string; at: string }[]): MonthRoles[] {
  const map = new Map<string, RoleCounts>();
  for (const c of commits) {
    const r = roleOf(c.message);
    if (!r) continue;
    const month = c.at.slice(0, 7);
    const row = map.get(month) ?? { ...ZERO };
    row[r]++;
    map.set(month, row);
  }
  const months = [...map.keys()].sort();
  if (months.length === 0) return [];
  const out: MonthRoles[] = [];
  for (let m = months[0]; m <= months.at(-1)!; m = nextMonth(m)) out.push({ month: m, ...(map.get(m) ?? ZERO) });
  return out;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export type WeekRoles = { week: string } & RoleCounts;

/** 커밋 → 주별(월요일 시작, UTC) 역할 수. 빈 주도 0으로 채웁니다 */
export function byWeek(commits: { message: string; at: string }[]): WeekRoles[] {
  const map = new Map<string, RoleCounts>();
  for (const c of commits) {
    const r = roleOf(c.message);
    if (!r) continue;
    const week = weekStart(c.at);
    const row = map.get(week) ?? { ...ZERO };
    row[r]++;
    map.set(week, row);
  }
  const weeks = [...map.keys()].sort();
  if (weeks.length === 0) return [];
  const out: WeekRoles[] = [];
  for (let w = weeks[0]; w <= weeks.at(-1)!; w = addDays(w, 7)) out.push({ week: w, ...(map.get(w) ?? ZERO) });
  return out;
}

/** 그 주 월요일(YYYY-MM-DD) */
export function weekStart(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 역량 분류 → 역할 색. 범례의 점 색이 차트와 같은 뜻을 갖게 합니다 */
export const CATEGORY_ROLE: Record<string, Role> = {
  process: "plan",
  design: "plan",
  frontend: "dev",
  backend: "dev",
  realtime: "dev",
  ai: "dev",
  qa: "qa",
  infra: "ops",
};
