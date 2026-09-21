import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ErrorKind } from "./errors";

/**
 * 호출 기록.
 *
 * YouTube Data API도 Gemini도 "남은 쿼터"를 물어볼 엔드포인트가 없습니다.
 * 호출할 때마다 직접 남기고 합산하는 것 외에 방법이 없습니다.
 *
 * **기록이 실패해도 본 기능은 계속 갑니다.** 사용량 추적은 편의 기능이지
 * 핵심 기능이 아닙니다 — 로그 INSERT가 안 된다고 영상 검색이나 글 생성이 막히면
 * 본말전도입니다. 그래서 이 파일의 함수는 어떤 경우에도 throw하지 않습니다.
 */

export type UsageEntry = {
  provider: "youtube" | "gemini";
  /** 'search.list' · 'playlistItems.list' · 'videos.list' · 'interactions.create' */
  operation: string;
  /** YouTube 전용. Gemini 호출에서는 0입니다. */
  quotaUnits?: number;
  /** Gemini 전용. */
  promptTokens?: number;
  /** Gemini 전용. 사고 토큰을 포함합니다 — 둘 다 출력으로 청구됩니다. */
  outputTokens?: number;
  model?: string | null;
  postId?: number | null;
  success: boolean;
  errorKind?: ErrorKind | null;
};

/**
 * 한 건을 남깁니다. 절대 throw하지 않습니다.
 *
 * `db`를 받는 이유는 스트리밍 때문입니다 — 응답이 흐르기 시작한 뒤에는
 * `cookies()`를 부를 수 없어서, 부르는 쪽이 미리 만든 클라이언트를 넘겨야 합니다.
 */
export async function logUsage(entry: UsageEntry, db?: SupabaseClient): Promise<void> {
  try {
    const supabase = db ?? (await createClient());
    const { error } = await supabase.from("api_usage_log").insert({
      provider: entry.provider,
      operation: entry.operation,
      quota_units: entry.quotaUnits ?? 0,
      prompt_tokens: entry.promptTokens ?? 0,
      output_tokens: entry.outputTokens ?? 0,
      model: entry.model ?? null,
      post_id: entry.postId ?? null,
      success: entry.success,
      error_kind: entry.errorKind ?? null,
    });

    // INSERT가 거부돼도 흐름은 그대로 둡니다. 남길 수 있는 건 흔적뿐입니다.
    if (error) console.error("[usage] 기록 실패:", error.message, entry);
  } catch (e) {
    console.error("[usage] 기록 실패:", e instanceof Error ? e.message : e, entry);
  }
}

/**
 * 스트리밍처럼 요청 범위를 벗어나 기록해야 할 때 미리 클라이언트를 잡아 둡니다.
 * 실패하면 null이고, 그때는 그냥 기록을 포기합니다.
 */
export async function usageClient(): Promise<SupabaseClient | null> {
  try {
    return await createClient();
  } catch (e) {
    console.error("[usage] 클라이언트 생성 실패:", e instanceof Error ? e.message : e);
    return null;
  }
}
