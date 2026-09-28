import { LEVEL_LABEL, type QuotaLevel } from "@/lib/ai/shared";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * 남은 여유 하나를 보여 줍니다.
 *
 * **숫자가 먼저, 막대는 거듭 말하는 것**입니다 — 색만으로 전하지 않는다는 규칙 때문에
 * 「남은 조회 87회」가 언제나 글자로 있고, 막대와 색은 그 위에 얹힙니다.
 * `<output aria-live="polite">`라 값이 바뀌면 보조기술에도 전달됩니다.
 */
export function QuotaMeter({
  label,
  value,
  limit,
  unit,
  level,
  note,
  className,
}: {
  label: string;
  /** 남은 수. 한도를 모르면 null */
  value: number | null;
  limit: number | null;
  unit: string;
  /** 한도를 모르면 null — 모르는 것을 '여유'라고 말하지 않습니다 */
  level: QuotaLevel | null;
  note?: string;
  className?: string;
}) {
  const known = value !== null && limit !== null && limit > 0;
  const percent = known ? Math.min(100, Math.round((value / limit) * 100)) : 0;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <p className="flex items-baseline justify-between gap-3 text-[0.8125rem] font-semibold text-text-2 tabular-nums">
        <span>{label}</span>
        {level && (
          <span
            className={cn(
              level === "warn" && "text-warn",
              level === "empty" && "text-danger",
            )}
          >
            {LEVEL_LABEL[level]}
          </span>
        )}
      </p>

      <output aria-live="polite" className="text-sm text-text">
        {known ? (
          <>
            남은 {unit} <strong className="font-semibold">{value.toLocaleString()}</strong>
            <span className="text-text-muted"> / {limit.toLocaleString()}</span>
          </>
        ) : (
          <span className="text-text-muted">한도를 확인하지 않았습니다</span>
        )}
      </output>

      {known && <Progress value={percent} tone={level ?? "ok"} aria-hidden="true" />}
      {note && <p className="text-xs leading-normal text-text-muted">{note}</p>}
    </div>
  );
}
