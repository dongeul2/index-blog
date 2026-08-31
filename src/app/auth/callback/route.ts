import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GitHub → Supabase → 여기.
 * 인가 코드를 세션으로 바꾸고 원래 가려던 곳으로 돌려보냅니다.
 *
 * 돌아갈 주소는 요청의 origin에서 유도합니다. 하드코딩하면 배포 후 localhost로 튕깁니다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const flowId = searchParams.get("sb_flow_id");
  const next = searchParams.get("next") ?? "/admin";

  // 열린 리다이렉트 방지 — 우리 사이트 안의 경로만 허용합니다.
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=no_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  if (error) {
    return NextResponse.redirect(
      `${origin}/admin/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${target}`);
}
