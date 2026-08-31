import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./env";

/**
 * 만료된 Auth 토큰을 갱신하고, 갱신된 값을 요청(서버 컴포넌트용)과 응답(브라우저용) 양쪽에
 * 심습니다. 서버 컴포넌트는 쿠키를 쓸 수 없으므로 이 일은 여기서만 일어납니다.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // 요청마다 새로 만듭니다 — 전역에 두면 다른 사용자의 세션이 섞입니다.
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // CDN이 이 응답을 캐시해 다른 사람에게 세션이 새어 나가지 않도록 하는 헤더입니다.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // createServerClient와 getClaims 사이에 코드를 넣지 마세요.
  // 사용자가 무작위로 로그아웃되는, 추적하기 어려운 버그가 생깁니다.
  //
  // getSession()은 JWT를 검증하지 않으므로 서버에서 신뢰하면 안 됩니다.
  // getClaims()는 매번 서명을 검증합니다.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;

  // 로그인하지 않았는데 관리자 화면에 들어오면 로그인 화면으로 보냅니다.
  // 실제 권한(허용 목록 대조)은 관리자 레이아웃과 RLS가 다시 확인합니다.
  if (!signedIn && pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // 이 응답 객체를 그대로 돌려줘야 합니다. 새로 만들면 쿠키가 유실되어
  // 브라우저와 서버의 세션이 어긋납니다.
  return response;
}
