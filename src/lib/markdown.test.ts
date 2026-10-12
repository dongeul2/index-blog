import type { Blockquote } from "mdast";
import { describe, expect, it } from "vitest";

import { parseCodeInfo, parseMarkdown, prepare, readingMinutes, toText, type WithCallout } from "./markdown";

describe("collectHeadings (prepare)", () => {
  it("h2·h3만 목차에 넣고 겹치는 슬러그에 번호를 붙인다", () => {
    const tree = parseMarkdown("# 제목\n\n## 설치\n\n### 설치\n\n#### 깊음\n\n## 설치");
    expect(prepare(tree)).toEqual([
      { id: "설치", text: "설치", level: 2 },
      { id: "설치-2", text: "설치", level: 3 },
      { id: "설치-3", text: "설치", level: 2 },
    ]);
  });

  it("{#id} 표기를 id로 쓰고 본문 텍스트에서는 걷어낸다", () => {
    const tree = parseMarkdown("## 왜 RLS인가 {#why-rls}");
    expect(prepare(tree)).toEqual([{ id: "why-rls", text: "왜 RLS인가", level: 2 }]);
    expect(toText(tree.children[0])).toBe("왜 RLS인가");
  });

  it("> [!WARNING] 인용구를 콜아웃으로 표시하고 표식을 지운다", () => {
    const tree = parseMarkdown("> [!WARNING]\n> 초안이 새어 나갑니다");
    prepare(tree);
    const quote = tree.children[0] as Blockquote & WithCallout;
    expect(quote.calloutKind).toBe("warn");
    expect(toText(quote)).toBe("초안이 새어 나갑니다");
  });
});

describe("parseCodeInfo", () => {
  it("언어:파일명과 강조 줄 범위를 푼다", () => {
    expect(parseCodeInfo("ts:toc.tsx", "{3,10-12}")).toEqual({
      lang: "ts",
      filename: "toc.tsx",
      highlight: [3, 10, 11, 12],
    });
  });

  it("정보가 없으면 text로 둔다", () => {
    expect(parseCodeInfo(null, null)).toEqual({ lang: "text", filename: "text", highlight: [] });
  });
});

describe("readingMinutes", () => {
  it("최소 1분, 코드는 절반만 센다", () => {
    expect(readingMinutes(parseMarkdown("짧은 글"))).toBe(1);
    const prose = "가".repeat(1500);
    const code = "```\n" + "x".repeat(1000) + "\n```";
    expect(readingMinutes(parseMarkdown(`${prose}\n\n${code}`))).toBe(4);
  });
});
