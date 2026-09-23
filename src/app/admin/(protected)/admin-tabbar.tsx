"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_TABS, isAdminTabCurrent } from "@/lib/admin-nav";

/**
 * 관리자 모바일 하단 내비 (디자인 시스템 §v0.2).
 * 데스크톱에서는 숨기고, 같은 항목을 헤더(`SiteHeader`)가 보여 줍니다.
 * 공개 영역에는 두지 않습니다.
 */
export function AdminTabbar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="관리자">
      {ADMIN_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={isAdminTabCurrent(pathname, tab.href) ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
