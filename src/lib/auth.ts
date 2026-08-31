import { cache } from "react";
import { createClient } from "./supabase/server";

export type Viewer = {
  /** GitHub 로그인 (표시용) */
  login: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

/**
 * 지금 요청을 보낸 사람이 누구인지.
 *
 * `getClaims()`를 씁니다 — 매번 JWT 서명을 검증합니다. `getSession()`은 검증하지 않으므로
 * 서버에서 권한 판단에 쓰면 안 됩니다.
 *
 * 관리자 여부는 앱이 아니라 DB에 묻습니다. 화면을 가리는 것과 데이터를 지키는 것이 같은
 * 판정(허용 목록)을 보게 되어, 둘이 어긋날 여지가 없습니다.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return null;

  const { data: isAdmin } = await supabase.rpc("is_admin");

  // 표시용 값은 신뢰하지 않아도 되는 자리라 user_metadata에서 읽습니다.
  // 인가 판단에는 절대 쓰지 않습니다 — 사용자가 고칠 수 있는 값입니다.
  const { data: userData } = await supabase.auth.getUser();
  const meta = userData.user?.user_metadata ?? {};

  return {
    login: (meta.user_name as string) ?? (meta.preferred_username as string) ?? null,
    avatarUrl: (meta.avatar_url as string) ?? null,
    isAdmin: isAdmin === true,
  };
});
