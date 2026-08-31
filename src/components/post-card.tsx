import Link from "next/link";
import { Highlighted } from "./highlighted";
import { CATEGORY_LABEL, formatDate, type PostMeta } from "@/lib/content-types";

/**
 * 포스트 카드 — 카드 전체가 링크 하나입니다.
 * 그래서 안쪽 태그는 링크가 아니라 텍스트로 둡니다(링크 중첩 금지).
 * 태그로 좁히는 동작은 카드 바깥의 필터 칩이 담당합니다.
 */
export function PostCard({ post, highlight }: { post: PostMeta; highlight?: string }) {
  return (
    <Link href={`/posts/${post.slug}`} className="post-card">
      <div className="post-card__meta">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <span>
          읽는 시간 <time dateTime={`PT${post.readingMinutes}M`}>{post.readingMinutes}분</time>
        </span>
        {post.generated && (
          /* 아이콘 없이 카테고리 색 텍스트로만 표기 */
          <span style={{ color: `var(--color-cat-${post.category})` }}>
            자동 생성
            <span className="sr-only">자동 생성된 요약</span>
          </span>
        )}
      </div>

      <div className="post-card__body">
        <span className={`badge badge--${post.category}`}>
          {CATEGORY_LABEL[post.category]}
          <span className="sr-only">분류: {CATEGORY_LABEL[post.category]}</span>
        </span>
        <h3 className="post-card__title">
          <Highlighted text={post.title} query={highlight ?? ""} />
        </h3>
        <p className="post-card__summary">
          <Highlighted text={post.summary} query={highlight ?? ""} />
        </p>
        <p className="post-card__tags">{post.tags.map((t) => `#${t}`).join("  ")}</p>
      </div>
    </Link>
  );
}
