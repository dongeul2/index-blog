import Link from "next/link";
import { archiveHref, type Filters } from "@/lib/content-types";

/**
 * 아카이브 페이지네이션.
 * 태그·검색 결과는 「더 보기」 버튼을 쓰지만 아카이브는 페이지네이션입니다
 * (무한 스크롤은 푸터 접근성 때문에 쓰지 않습니다).
 */
export function Pagination({
  current,
  totalPages,
  filters,
}: {
  current: number;
  totalPages: number;
  filters: Filters;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="pagination" role="group" aria-label="아카이브 페이지">
      {current > 1 && (
        <Link href={archiveHref({ ...filters, page: current - 1 })} className="pagination__step">
          이전
        </Link>
      )}

      {pages.map((p) =>
        p === current ? (
          <span key={p} className="pagination__page pagination__page--current" aria-current="page">
            {p}
            <span className="sr-only">페이지, 현재 페이지</span>
          </span>
        ) : (
          <Link key={p} href={archiveHref({ ...filters, page: p })} className="pagination__page">
            {p}
            <span className="sr-only">페이지</span>
          </Link>
        ),
      )}

      {current < totalPages && (
        <Link href={archiveHref({ ...filters, page: current + 1 })} className="pagination__step">
          다음
        </Link>
      )}
    </div>
  );
}
