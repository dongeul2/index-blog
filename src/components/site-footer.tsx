import Link from "next/link";
import { BackToTop } from "./back-to-top";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page site-footer__inner">
        <div>
          <Link href="/" className="logo">
            INDEX.
          </Link>
          <p className="site-footer__note" style={{ marginTop: "0.5rem" }}>
            포트폴리오와 개발 기록.
          </p>
        </div>
        <div className="site-footer__links">
          <Link href="/notes">기록</Link>
          <Link href="/archive">아카이브</Link>
          <Link href="/tags">태그</Link>
          <Link href="/admin/login?next=/">관리자</Link>
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}
