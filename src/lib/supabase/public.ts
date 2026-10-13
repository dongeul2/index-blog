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

/** 이 태그를 `revalidateTag(PUBLIC_DATA_TAG, "max")`하면 공개 화면의 DB 조회가 모두 새로 받아집니다. */
export const PUBLIC_DATA_TAG = "public-db";

/** 관리자 화면을 거치지 않은 변경(DB 콘솔·스크립트)도 이 시간 안에는 반영됩니다. */
const REVALIDATE_SECONDS = 3600;

/**
 * 캐시 정책 버전. fetch 캐시 키는 URL·메서드·헤더·본문으로만 정해지므로, 정책을 바꿀 때 이 값을
 * 올려야 예전 항목이 다시 쓰이지 않습니다. v1은 정책이 없던 시절 — 유효기간 1년으로 저장된 글
 * 목록이 Vercel 데이터 캐시에 남아, 배포를 새로 해도 지운 글이 보였습니다(ADR 0005).
 */
const CACHE_POLICY = "v2";

const cachedFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set("x-index-cache-policy", CACHE_POLICY);
  return fetch(input, {
    ...init,
    headers,
    cache: "force-cache",
    next: { revalidate: REVALIDATE_SECONDS, tags: [PUBLIC_DATA_TAG] },
  });
};

export const supabasePublic = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: cachedFetch },
});
