import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./env";

/**
 * 서버 컴포넌트 · 서버 액션 · 라우트 핸들러용. 요청의 쿠키에서 세션을 읽습니다.
 *
 * 쿠키를 읽으므로 이걸 쓰는 페이지는 동적이 됩니다. 공개 화면은 정적 생성을 유지해야 하니
 * `public.ts`의 anon 클라이언트를 쓰고, 이 클라이언트는 관리자 영역에서만 씁니다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없습니다.
          // 토큰 갱신은 proxy가 담당하므로 여기서는 무시해도 됩니다.
        }
      },
    },
  });
}
