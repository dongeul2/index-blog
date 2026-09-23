import type { WeeklyActivity } from "@/lib/activity";

/**
 * 최근 N주 발행 빈도 — 막대 괘선. GitHub의 contribution graph를 흑백+액센트 1개로
 * 옮긴 것입니다. 장식이 아니라 정보라, 막대는 `aria-hidden`으로 감추고 값 자체를
 * `role="img"` + `aria-label`로 한 문장으로 전합니다.
 */
export function ActivitySpark({ activity }: { activity: WeeklyActivity }) {
  const { weeks } = activity;
  const max = Math.max(1, ...weeks);

  return (
    <div
      role="img"
      aria-label={`최근 ${weeks.length}주 발행 글 수: ${weeks.join(", ")}건 (오래된 주부터)`}
      className="flex h-8 items-end gap-[3px]"
    >
      {weeks.map((n, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={n > 0 ? "spark-bar w-1.5 bg-accent" : "spark-bar w-1.5 bg-border"}
          style={{
            height: `${Math.max(10, Math.round((n / max) * 100))}%`,
            animationDelay: `${i * 30}ms`,
          }}
        />
      ))}
    </div>
  );
}
