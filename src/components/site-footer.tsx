import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page site-footer__inner">
        <div>
          <Link href="/" className="logo">
            INDEX<span className="logo__dot">.</span>
          </Link>
          <p className="site-footer__note" style={{ marginTop: "0.5rem" }}>
            개발 일지 · 영상 요약 · 일반 글
          </p>
        </div>
        <div className="site-footer__links">
          <Link href="/archive">아카이브</Link>
          <Link href="/projects">프로젝트</Link>
          <Link href="/tags">태그</Link>
        </div>
      </div>
    </footer>
  );
}
