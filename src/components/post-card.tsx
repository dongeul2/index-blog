import Link from "next/link";
import { Highlighted } from "./highlighted";
import { CATEGORY_LABEL, formatDate, type PostMeta } from "@/lib/content-types";
import { Badge } from "@/components/ui/badge";

/**
 * 포스트 카드 — 카드 전체가 링크 하나입니다.
 * 그래서 안쪽 태그는 링크가 아니라 텍스트로 둡니다(링크 중첩 금지).
 * 태그로 좁히는 동작은 카드 바깥의 필터 칩이 담당합니다.
 *
 * **영상요약(video) 글만 썸네일을 보여줍니다.** 이 시스템은 원래 이미지를 쓰지
 * 않지만, 이 썸네일은 장식이 아니라 그 글이 실제로 다루는 영상 자체입니다 — YouTube가
 * 공개하는 고정 URL(`i.ytimg.com`)이라 API 키도 쿼터도 쓰지 않습니다.
 */
export function PostCard({ post, highlight }: { post: PostMeta; highlight?: string }) {
  const thumbnail =
    post.category === "video" && post.sourceRef
      ? `https://i.ytimg.com/vi/${post.sourceRef}/hqdefault.jpg`
      : null;

  return (
    <Link href={`/posts/${post.slug}`} className="post-card">
      {thumbnail && (
        // media-frame이 16:9 · 보더 · hover 밝기(a:hover 상위 선택자)를 전부 맡습니다.
        // post-card__thumb는 2열 그리드에서 썸네일이 두 열을 다 차지하게만 합니다.
        <div className="post-card__thumb media-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnail} alt={`${post.title} 썸네일`} loading="lazy" />
        </div>
      )}

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
        <Badge variant={post.category}>
          {CATEGORY_LABEL[post.category]}
          <span className="sr-only">분류: {CATEGORY_LABEL[post.category]}</span>
        </Badge>
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
