"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 관리자 모바일 하단 내비 (디자인 시스템 §v0.2).
 * 텍스트 라벨만 씁니다 — 아이콘 없음. 공개 영역에는 두지 않습니다.
 */
const TABS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/videos", label: "영상" },
  { href: "/admin/projects", label: "프로젝트" },
  { href: "/admin/posts/new", label: "새 글" },
];

export function AdminTabbar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="관리자">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={pathname === tab.href ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
