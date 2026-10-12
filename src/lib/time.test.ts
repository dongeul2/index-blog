import { describe, expect, it } from "vitest";

import { formatDuration, spokenDuration } from "./duration";
import { relativeTime } from "./time";

describe("relativeTime", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  const ago = (sec: number) => new Date(now.getTime() - sec * 1000).toISOString();

  it.each([
    [30, "방금"],
    [5 * 60, "5분 전"],
    [3 * 3600, "3시간 전"],
    [86400, "어제"],
    [3 * 86400, "3일 전"],
    [14 * 86400, "2주 전"],
    [60 * 86400, "2개월 전"],
    [800 * 86400, "2년 전"],
  ])("%i초 전 → %s", (sec, label) => {
    expect(relativeTime(ago(sec), now)).toBe(label);
  });

  it("해석할 수 없는 값은 빈 문자열", () => {
    expect(relativeTime("not-a-date", now)).toBe("");
  });
});

describe("duration", () => {
  it("한 시간이 넘으면 분을 두 자리로 채운다", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("보조기술용 문구는 0인 단위를 생략한다", () => {
    expect(spokenDuration(3605)).toBe("1시간 5초");
  });
});
