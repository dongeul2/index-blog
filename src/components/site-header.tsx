"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteSearch } from "./site-search";
import { ThemeToggle } from "./theme-toggle";
import { useReadingTitle } from "./reading-title";
import type { SearchItem } from "@/lib/search-index";
import { ADMIN_TABS, isAdminTabCurrent } from "@/lib/admin-nav";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/archive", label: "아카이브" },
  { href: "/projects", label: "프로젝트" },
  { href: "/tags", label: "태그" },
];

export function SiteHeader({ searchIndex }: { searchIndex: SearchItem[] }) {
  const pathname = usePathname();
  // 관리자 영역에서는 「사이트 보기 / 나가기」만 남긴 축소형으로 분기합니다.
  const isAdmin = pathname.startsWith("/admin");
  const readingTitle = useReadingTitle();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    function measure() {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 120); // 120px 초과에서 축소
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(measure);
    }
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header className={scrolled ? "site-header site-header--scrolled" : "site-header"}>
      <div className="page site-header__inner">
        <Link href="/" className="logo">
          INDEX<span className="logo__dot">.</span>
        </Link>

        {/* 축소 상태에서만 보이는 "지금 읽는 글" */}
        <p className="site-header__title" aria-hidden={!scrolled || !readingTitle}>
          {scrolled ? readingTitle : null}
        </p>

        {isAdmin ? (
          <div className="site-nav">
            {/* 모바일은 하단 탭바가 같은 항목을 보여 주므로, 데스크톱(탭바가 숨는 폭)에서만 */}
            <nav aria-label="관리자" className="hidden min-[48rem]:contents">
              {ADMIN_TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="nav-link"
                  aria-current={isAdminTabCurrent(pathname, tab.href) ? "page" : undefined}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
            <Link href="/" className="nav-link">
              사이트 보기
            </Link>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="link" size="xs" className="px-0 text-text-2 hover:text-accent">
                나가기
              </Button>
            </form>
          </div>
        ) : (
          <nav aria-label="주 메뉴" className="site-nav">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="nav-link"
                aria-current={pathname === n.href ? "page" : undefined}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}

        {!isAdmin && <SiteSearch index={searchIndex} />}
        <ThemeToggle />
      </div>

      {/* 읽기 진행 바 — 축소 상태에서만 */}
      <div
        className="site-header__progress"
        style={{ width: scrolled ? `${progress * 100}%` : 0 }}
        aria-hidden="true"
      />
    </header>
  );
}
