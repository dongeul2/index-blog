import { describe, expect, it } from "vitest";

import { archiveHref, formatDate, isCategory, paginate } from "./content-types";

describe("archiveHref", () => {
  it("필터가 없으면 쿼리 없이 /archive", () => {
    expect(archiveHref({})).toBe("/archive");
  });

  it("값이 있는 축만 쿼리에 넣는다", () => {
    expect(archiveHref({ category: "devlog", year: "2026" })).toBe("/archive?category=devlog&year=2026");
  });

  it("1페이지는 URL에 적지 않는다", () => {
    expect(archiveHref({ tag: "rls", page: 1 })).toBe("/archive?tag=rls");
    expect(archiveHref({ tag: "rls", page: 3 })).toBe("/archive?tag=rls&page=3");
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 13 }, (_, i) => i);

  it("범위를 벗어난 페이지는 양 끝으로 고정한다", () => {
    expect(paginate(items, 0, 6).current).toBe(1);
    expect(paginate(items, 99, 6)).toMatchObject({ current: 3, totalPages: 3, items: [12] });
  });

  it("빈 목록도 1페이지로 본다", () => {
    expect(paginate([], 1)).toEqual({ items: [], current: 1, totalPages: 1, total: 0 });
  });
});

describe("formatDate / isCategory", () => {
  it("월·일의 앞자리 0을 뗀다", () => {
    expect(formatDate("2026-03-07")).toBe("2026년 3월 7일");
  });

  it("알 수 없는 분류를 거른다", () => {
    expect(isCategory("devlog")).toBe(true);
    expect(isCategory("news")).toBe(false);
    expect(isCategory(undefined)).toBe(false);
  });
});
