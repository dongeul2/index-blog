import Link from "next/link";
import type { PostMeta } from "@/lib/content-types";

export function PostNav({ prev, next }: { prev?: PostMeta; next?: PostMeta }) {
  if (!prev && !next) return null;
  return (
    <div className="post-nav" role="group" aria-label="이전 다음 글">
      {prev ? (
        <Link href={`/posts/${prev.slug}`} className="post-nav__item">
          <span className="post-nav__dir">이전 글</span>
          <span className="post-nav__title">{prev.title}</span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link href={`/posts/${next.slug}`} className="post-nav__item post-nav__item--next">
          <span className="post-nav__dir">다음 글</span>
          <span className="post-nav__title">{next.title}</span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
