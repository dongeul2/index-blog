import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next 16에서 `middleware`는 `proxy`로 이름이 바뀌었습니다.
 *
 * 공개 화면에는 걸지 않습니다 — 세션 갱신이 필요 없고, 공개 경로는 정적으로 서빙되는 편이
 * 낫습니다. 관리자와 인증 콜백에만 겁니다.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*"],
};
