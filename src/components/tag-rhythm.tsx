import Link from "next/link";
import type { Facet } from "@/lib/content-types";

/**
 * 태그 리듬 — 05 태그 페이지의 "빈도를 괘선 길이로" 패턴을 홈에서 더 작게.
 * 글자 크기를 키우지 않습니다(태그 페이지와 같은 이유 — 읽기 리듬이 깨집니다).
 * 대신 막대 길이 + 숫자로만 빈도를 보여줍니다.
 */
export function TagRhythm({ tags }: { tags: Facet[] }) {
  const max = Math.max(1, ...tags.map((t) => t.count));

  return (
    <ul className="flex flex-col gap-2.5">
      {tags.map((t, i) => (
        <li key={t.value}>
          <Link
            href={`/tags/${encodeURIComponent(t.value)}`}
            className="group flex items-center gap-3 font-mono text-[0.8125rem] hover:no-underline"
          >
            <span className="w-24 shrink-0 truncate text-text-2 group-hover:text-accent sm:w-32">
              #{t.value}
            </span>
            <span className="relative h-1.5 flex-1 bg-surface">
              <span
                aria-hidden="true"
                className="tag-bar absolute inset-y-0 left-0 bg-accent"
                style={{
                  width: `${Math.round((t.count / max) * 100)}%`,
                  animationDelay: `${i * 40}ms`,
                }}
              />
            </span>
            <span className="w-6 shrink-0 text-right text-text-muted">
              {t.count}
              <span className="sr-only">편</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
