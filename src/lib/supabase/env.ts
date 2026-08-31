/**
 * 공개 키 이름이 두 가지입니다.
 * Supabase가 `anon` 키를 publishable 키(`sb_publishable_...`)로 바꾸는 중이라, 둘 다 받습니다.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
