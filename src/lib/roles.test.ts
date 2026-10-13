import { describe, expect, it } from "vitest";

import { byMonth, byWeek, countRoles, roleOf, toPercent, weekStart } from "./roles";

describe("roleOf", () => {
  it.each([
    ["feat(home): 원페이지 홈", "dev"],
    ["fix(cache): 캐시 정책", "qa"],
    ["test: 스모크", "qa"],
    ["docs: ADR", "plan"],
    ["ci: release token", "ops"],
    ["build(deps): bump", "ops"],
    ["feat!: breaking", "dev"],
    ["chore(main): release 0.3.0", "ops"],
  ])("%s → %s", (msg, role) => {
    expect(roleOf(msg)).toBe(role);
  });

  it("규칙을 따르지 않으면 세지 않는다", () => {
    expect(roleOf("Merge branch main")).toBeNull();
    expect(roleOf("featured: nope")).toBeNull();
    expect(roleOf("wip: 작업 중")).toBeNull();
  });
});

describe("toPercent", () => {
  it("합이 언제나 100", () => {
    const p = toPercent(countRoles(["feat: a", "feat: b", "fix: c", "docs: d", "ci: e", "ci: f"]));
    expect(p.plan + p.dev + p.qa + p.ops).toBe(100);
    expect(p).toEqual({ plan: 17, dev: 33, qa: 17, ops: 33 });
  });

  it("빈 기록은 모두 0", () => {
    expect(toPercent(countRoles([]))).toEqual({ plan: 0, dev: 0, qa: 0, ops: 0 });
  });
});

describe("byMonth", () => {
  it("빈 달을 0으로 채운다", () => {
    const rows = byMonth([
      { message: "feat: a", at: "2026-08-03T00:00:00Z" },
      { message: "docs: b", at: "2026-10-01T00:00:00Z" },
    ]);
    expect(rows.map((r) => r.month)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(rows[1]).toEqual({ month: "2026-09", plan: 0, dev: 0, qa: 0, ops: 0 });
  });
});


describe("byWeek", () => {
  it("월요일로 묶고 빈 주를 채운다", () => {
    expect(weekStart("2026-10-12T09:00:00Z")).toBe("2026-10-12"); // 월요일
    expect(weekStart("2026-10-18T23:00:00Z")).toBe("2026-10-12"); // 일요일
    const rows = byWeek([
      { message: "feat: a", at: "2026-09-28T00:00:00Z" },
      { message: "fix: b", at: "2026-10-13T00:00:00Z" },
    ]);
    expect(rows.map((r) => r.week)).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(rows[2]).toMatchObject({ qa: 1, dev: 0 });
  });
});
