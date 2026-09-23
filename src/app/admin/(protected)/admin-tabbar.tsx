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

/**
 * 「영상」 탭은 `/admin/videos/channels`에서도 켜져 있어야 합니다 —
 * 하위 화면에 들어갔다고 탭이 꺼지면 지금 어디인지 알 수 없습니다.
 * 반대로 `/admin`(대시보드)은 접두사로 재면 모든 화면에서 켜지므로 정확히 맞춥니다.
 */
function isCurrent(pathname: string, href: string): boolean {
  if (href === "/admin" || href === "/admin/posts/new") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminTabbar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="관리자">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={isCurrent(pathname, tab.href) ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
