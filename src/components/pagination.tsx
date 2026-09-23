import Link from "next/link";
import { archiveHref, type Filters } from "@/lib/content-types";
import {
  Pagination as PaginationRoot,
  PaginationItem,
} from "@/components/ui/pagination";

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
    <PaginationRoot aria-label="아카이브 페이지" className="mt-12">
      {current > 1 && (
        <PaginationItem asChild variant="step">
          <Link href={archiveHref({ ...filters, page: current - 1 })}>이전</Link>
        </PaginationItem>
      )}

      {pages.map((p) =>
        p === current ? (
          <PaginationItem key={p} variant="current" aria-current="page">
            {p}
            <span className="sr-only">페이지, 현재 페이지</span>
          </PaginationItem>
        ) : (
          <PaginationItem key={p} asChild>
            <Link href={archiveHref({ ...filters, page: p })}>
              {p}
              <span className="sr-only">페이지</span>
            </Link>
          </PaginationItem>
        ),
      )}

      {current < totalPages && (
        <PaginationItem asChild variant="step">
          <Link href={archiveHref({ ...filters, page: current + 1 })}>다음</Link>
        </PaginationItem>
      )}
    </PaginationRoot>
  );
}
