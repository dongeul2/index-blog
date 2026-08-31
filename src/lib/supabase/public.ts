import { createClient } from "@supabase/supabase-js";

/**
 * 공개 읽기 전용 클라이언트.
 *
 * 쿠키를 건드리지 않습니다 — 세션을 읽는 순간 그 페이지는 동적이 되어 정적 생성이
 * 불가능해집니다. 공개 화면은 어차피 발행된 글만 보면 되고, 그 경계는 RLS가 지킵니다.
 * 로그인한 사람으로서 읽어야 하는 곳(관리자)은 `server.ts`를 씁니다.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL 과 공개 키(PUBLISHABLE 또는 ANON)가 .env.local 에 있어야 합니다.",
  );
}

export const supabasePublic = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
