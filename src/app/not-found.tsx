import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_LABEL, formatDate, getPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "찾을 수 없는 페이지",
};

/** 08 — 최근 글 3편으로 회수합니다. */
export default async function NotFound() {
  const recent = (await getPosts()).slice(0, 3);

  return (
    <div className="page notfound">
      <header className="notfound__head">
        <p className="notfound__code" aria-hidden="true">
          404
        </p>
        <h1 className="notfound__title">이 주소에는 아무것도 없습니다</h1>
        <p className="notfound__sub">
          주소가 바뀌었거나, 글이 지워졌거나, 애초에 없던 페이지입니다.
        </p>
        <p className="notfound__actions">
          <Link href="/">홈으로</Link>
          <span className="notfound__sep" aria-hidden="true">/</span>
          <Link href="/archive">아카이브</Link>
          <span className="notfound__sep" aria-hidden="true">/</span>
          <Link href="/search">검색</Link>
        </p>
      </header>

      <section className="notfound__recent">
        <p className="notfound__recent-label">최근 글</p>
        <ul>
          {recent.map((p) => (
            <li key={p.slug}>
              <Link href={`/posts/${p.slug}`} className="notfound__link">
                {p.title}
              </Link>
              <p className="notfound__meta">
                {CATEGORY_LABEL[p.category]}
                <span aria-hidden="true"> / </span>
                <time dateTime={p.date}>{formatDate(p.date)}</time>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
