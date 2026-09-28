import type { Metadata } from "next";
import Link from "next/link";
import { RealtimePosts } from "./realtime-posts";
import { BookmarksWidget } from "./bookmarks-widget";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL } from "@/lib/content-types";
import {
  STATUS_BADGE,
  STATUS_LABEL,
  STATUS_ORDER,
  countByStatus,
  getAdminPosts,
  readStatus,
  type AdminPost,
  type PostStatus,
} from "@/lib/admin-posts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "대시보드",
  robots: { index: false, follow: false },
};

type Search = { status?: string };

const adminHref = (status?: PostStatus) => (status ? `/admin?status=${status}` : "/admin");

/** 서울 기준 날짜시각. 예약 발행은 분까지 보여야 의미가 있습니다. */
function seoulDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function StatusBadge({ post }: { post: AdminPost }) {
  return (
    <span className="queue-row__badges">
      <Badge variant={STATUS_BADGE[post.status]}>
        {STATUS_LABEL[post.status]}
        <span className="sr-only">상태: {STATUS_LABEL[post.status]}</span>
      </Badge>
      {post.scheduled && post.status === "published" && (
        <Badge variant="scheduled">예약 발행</Badge>
      )}
    </span>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<Search> }) {
  const [viewer, posts, sp] = await Promise.all([getViewer(), getAdminPosts(), searchParams]);

  const supabase = await createClient();
  const { data: bookmarkRows } = await supabase
    .from("bookmarks")
    .select("id, url, title")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const active = readStatus(sp.status);
  const counts = countByStatus(posts);
  const shown = active ? posts.filter((p) => p.status === active) : posts;

  return (
    <div className="page admin-page">
      <header className="admin-head">
        <div className="admin-head__row">
          <div>
            <h1 className="admin-head__title">대시보드</h1>
          </div>
          <Button asChild>
            <Link href="/admin/posts/new">새 글</Link>
          </Button>
        </div>

        <p className="admin-head__who">
          <strong>{viewer?.login}</strong>님, 글이 {posts.length}편 있습니다.
        </p>
        <RealtimePosts />

        <BookmarksWidget bookmarks={bookmarkRows ?? []} />
      </header>

      {/* 상태별 요약이자 필터. 링크라 URL이 곧 화면입니다. */}
      <div className="status-grid">
        <Link
          href={adminHref()}
          className="status-tile"
          aria-current={active ? undefined : "page"}
        >
          <span className="status-tile__label">전체</span>
          <span className="status-tile__count">{posts.length}</span>
        </Link>

        {STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={adminHref(s)}
            className="status-tile"
            aria-current={active === s ? "page" : undefined}
          >
            <span className="status-tile__label">
              <Badge variant={STATUS_BADGE[s]}>{STATUS_LABEL[s]}</Badge>
            </span>
            <span className="status-tile__count">{counts[s]}</span>
          </Link>
        ))}
      </div>

      {/* 상태 전환은 배지 교체로만 알립니다 — 색과 텍스트를 동시에 바꿉니다. */}
      {shown.length > 0 ? (
        <ul className="queue-list" aria-live="polite">
          {shown.map((post) => (
            <li className="queue-row" key={post.slug}>
              <StatusBadge post={post} />

              <div className="queue-row__body">
                <Link href={`/admin/posts/${post.slug}`} className="queue-row__title">
                  {post.title}
                </Link>
                <p className="queue-row__meta">
                  {CATEGORY_LABEL[post.category]}
                  {post.generated && <span className="queue-row__auto"> · 자동 생성</span>}
                  <span aria-hidden="true"> · </span>
                  {post.publishedAt ? (
                    <>
                      발행 <time dateTime={post.publishedAt}>{seoulDateTime(post.publishedAt)}</time>
                    </>
                  ) : (
                    "발행 시각 없음"
                  )}
                </p>
              </div>

              <p className="queue-row__updated">
                <time dateTime={post.updatedAt}>{seoulDateTime(post.updatedAt)}</time>
                <span className="queue-row__updated-label">마지막 수정</span>
              </p>

              {post.status === "published" && !post.scheduled && (
                <Link href={`/posts/${post.slug}`} className="queue-row__view">
                  공개 화면에서 보기
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state admin-empty">
          <p>
            {active
              ? `${STATUS_LABEL[active]} 상태인 글이 없습니다.`
              : "아직 글이 없습니다."}
          </p>
          <p className="admin-empty__action">
            <Button asChild>
              <Link href="/admin/posts/new">새 글 쓰기</Link>
            </Button>
          </p>
        </div>
      )}
    </div>
  );
}
