/**
 * 관리자 내비 항목. 모바일 하단 탭바와 데스크톱 헤더가 같은 목록을 씁니다.
 * 텍스트 라벨만 씁니다 — 아이콘 없음.
 */
export const ADMIN_TABS = [
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
export function isAdminTabCurrent(pathname: string, href: string): boolean {
  if (href === "/admin" || href === "/admin/posts/new") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
