// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Highlighted } from "./highlighted";

describe("<Highlighted>", () => {
  it("대소문자를 무시하고 일치 구간마다 <mark>로 감싸되 원문 대소문자를 유지한다", () => {
    const { container } = render(<Highlighted text="RLS와 rls 정책" query="rls" />);
    const marks = [...container.querySelectorAll("mark")].map((m) => m.textContent);
    expect(marks).toEqual(["RLS", "rls"]);
    expect(container.textContent).toBe("RLS와 rls 정책");
  });

  it("빈 검색어나 불일치면 <mark>가 없다", () => {
    expect(render(<Highlighted text="본문" query="  " />).container.querySelector("mark")).toBeNull();
    expect(render(<Highlighted text="본문" query="없음" />).container.querySelector("mark")).toBeNull();
  });
});
