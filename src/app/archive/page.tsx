import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { PostCard } from "@/components/post-card";
import {
  CATEGORY_LABEL,
  archiveHref,
  filterPosts,
  isCategory,
  paginate,
  type Filters,
} from "@/lib/posts";

export const metadata: Metadata = {
  title: "아카이브",
  description: "분류·태그·연도로 좁혀 보는 전체 글 목록.",
};

type Search = { category?: string; tag?: string; year?: string; page?: string };

/** 쿼리 문자열은 사용자가 손으로 고칠 수 있으므로 값을 신뢰하지 않고 정규화합니다. */
function readFilters(sp: Search): Filters {
  return {
    category: isCategory(sp.category) ? sp.category : undefined,
    tag: sp.tag?.trim() || undefined,
    year: /^\d{4}$/.test(sp.year ?? "") ? sp.year : undefined,
  };
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const filters = readFilters(sp);
  const pageNo = Number.parseInt(sp.page ?? "1", 10);

  const matched = await filterPosts(filters);
  const { items, current, totalPages, total } = paginate(
    matched,
    Number.isFinite(pageNo) ? pageNo : 1,
  );

  const active = [
    filters.category && CATEGORY_LABEL[filters.category],
    filters.tag && `#${filters.tag}`,
    filters.year && `${filters.year}년`,
  ].filter(Boolean) as string[];

  return (
    <div className="page archive">
      <header className="archive__head">
        <h1 className="archive__title">아카이브</h1>
        {/* 필터를 바꾸면 결과 개수를 소리로도 알립니다 */}
        <p className="archive__count" role="status" aria-live="polite">
          {active.length > 0 ? `${active.join(" · ")} — ` : ""}
          {total}개의 글
          {totalPages > 1 && (
            <span className="archive__page-of">
              {" "}
              ({current} / {totalPages} 페이지)
            </span>
          )}
        </p>
      </header>

      <FilterBar filters={filters} />

      {items.length > 0 ? (
        <ul className="archive__list">
          {items.map((p) => (
            <li key={p.slug}>
              <PostCard post={p} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state archive__empty">
          <p>고른 조건에 맞는 글이 없습니다.</p>
          <p style={{ marginTop: "1rem" }}>
            <Link href={archiveHref({})}>필터 모두 지우기</Link>
          </p>
        </div>
      )}

      <Pagination current={current} totalPages={totalPages} filters={filters} />
    </div>
  );
}
