import { describe, expect, it } from "vitest";

import { richHeadings, richReadingMinutes, richText, safeHref, safeTextStyle, type RichDoc } from "./rich";

const doc: RichDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "설치" }] },
    { type: "paragraph", content: [{ type: "text", text: "가".repeat(1200) }] },
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "설치" }] },
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "무시" }] },
  ],
};

describe("richHeadings", () => {
  it("h2·h3만, 겹치는 id에 번호", () => {
    expect(richHeadings(doc)).toEqual([
      { id: "설치", text: "설치", level: 2 },
      { id: "설치-2", text: "설치", level: 3 },
    ]);
  });
});

describe("richText / 읽는 시간", () => {
  it("블록 사이를 줄바꿈으로 잇고 분당 500자로 센다", () => {
    expect(richText(doc).split("\n")[0]).toBe("설치");
    expect(richReadingMinutes(doc)).toBe(2);
  });
});

describe("허용 목록", () => {
  it("목록 밖의 스타일 값은 버린다 (CSS 주입 차단)", () => {
    expect(safeTextStyle({ fontSize: "20px", color: "#e5484d", fontFamily: "serif" })).toMatchObject({
      fontSize: "20px",
      color: "#e5484d",
    });
    expect(safeTextStyle({ fontSize: "999px;background:url(x)", color: "red", fontFamily: "Comic Sans" })).toEqual({});
  });

  it("javascript: 링크는 막는다", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("/projects/x")).toBe("/projects/x");
  });
});
