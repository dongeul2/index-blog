import { describe, expect, it } from "vitest";

import { toSlug, uniqueSlug } from "./slug";

describe("toSlug", () => {
  it("라틴 문자는 소문자-하이픈으로", () => {
    expect(toSlug("Index Blog: v2!")).toBe("index-blog-v2");
    expect(toSlug("Café Naïve")).toBe("cafe-naive");
  });

  it("라틴 문자가 없으면 접두어와 무작위 꼬리", () => {
    expect(toSlug("자동 게시 엔진")).toMatch(/^p-[a-z0-9]{1,5}$/);
    expect(toSlug("실시간", "s")).toMatch(/^s-/);
  });

  it("섞여 있으면 라틴 부분만 남긴다", () => {
    expect(toSlug("기록실 INDEX.")).toBe("index");
  });
});

describe("uniqueSlug", () => {
  it("겹치면 번호를 붙인다", () => {
    expect(uniqueSlug("index", new Set(["index", "index-2"]))).toBe("index-3");
    expect(uniqueSlug("new", new Set(["index"]))).toBe("new");
  });
});
