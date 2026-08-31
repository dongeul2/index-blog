import { redirect } from "next/navigation";
import { AdminTabbar } from "./admin-tabbar";
import { getViewer } from "@/lib/auth";

/**
 * 관리자 영역 관문.
 *
 * 로그인만으로는 부족합니다 — GitHub OAuth는 아무 계정이나 통과시키므로, 허용 목록에
 * 있는지 DB에 물어봅니다. 화면을 가리는 것은 여기, 데이터를 지키는 것은 RLS입니다.
 * 둘 다 같은 판정(`private.is_admin()`)을 보므로 어긋날 여지가 없습니다.
 *
 * `/admin/login`은 이 그룹 밖에 있어 이 관문을 통과하지 않습니다(무한 리다이렉트 방지).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) redirect("/admin/login");
  if (!viewer.isAdmin) redirect("/admin/login?error=not_admin");

  return (
    <div className="admin">
      {children}
      <AdminTabbar />
    </div>
  );
}
