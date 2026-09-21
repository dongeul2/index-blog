import "server-only";
import { createClient } from "@/lib/supabase/server";
import { UNITS } from "@/lib/youtube";
import { getModels } from "./models";
import type { QuotaLevel } from "./shared";

/**
 * 남은 여유.
 *
 * 집계(사실)는 DB가, 한도와 임계값(정책)은 여기가 맡습니다.
 * 한도를 DB에 박으면 수치가 바뀔 때마다 마이그레이션을 돌려야 하고,
 * Google은 한도를 자주 조정하면서 문서로는 "AI Studio에서 확인하라"고만 합니다.
 *
 * 그래서 이 파일에 숫자를 하드코딩하지 않습니다 — 전부 환경변수나 ai_models에서 옵니다.
 * 아래 기본값은 '추정치'가 아니라 '문서에 적힌 표준값'이거나 '화면 임계값'입니다.
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const CONFIG = {
  /** YouTube Data API 일일 쿼터. 10,000은 Google의 표준 기본값입니다. */
  youtubeDailyQuota: () => envInt("YOUTUBE_DAILY_QUOTA", 10_000),
  /** 남은 검색이 이 수 이하면 '주의'. 디자인 시스템 §205의 20을 기본으로 씁니다. */
  youtubeWarnSearches: () => envInt("YOUTUBE_WARN_SEARCHES", 20),
  /** 남은 요청이 이 수 이하면 '주의'. */
  geminiWarnRequests: () => envInt("GEMINI_WARN_REQUESTS", 10),
};

/** 남은 수를 3단계로. 한도를 모르면 판정하지 않습니다(null). */
function levelOf(remaining: number, warnAt: number): QuotaLevel {
  if (remaining <= 0) return "empty";
  if (remaining <= warnAt) return "warn";
  return "ok";
}

export type YouTubeQuota = {
  unitsUsed: number;
  unitsLimit: number;
  unitsRemaining: number;
  /**
   * 남은 유닛으로 할 수 있는 검색 횟수.
   *
   * 「8,700유닛 남음」은 아무 의미가 없습니다. 「검색 87회 남음」이어야
   * 지금 검색을 눌러도 되는지 판단할 수 있습니다.
   */
  searchesRemaining: number;
  calls: number;
  level: QuotaLevel;
};

export type ModelQuota = {
  id: string;
  label: string;
  description: string;
  requestsUsed: number;
  /** ai_models.daily_requests. 확인하지 않았으면 null입니다. */
  requestsLimit: number | null;
  /** 한도를 모르면 null — 0과 반드시 구별해야 합니다. */
  remaining: number | null;
  /** 한도를 모르면 null. 모르는 것을 '여유'라고 말하지 않습니다. */
  level: QuotaLevel | null;
  failures: number;
};

export type GeminiQuota = {
  requests: number;
  promptTokens: number;
  outputTokens: number;
  models: ModelQuota[];
};

export type Quota = {
  youtube: YouTubeQuota;
  gemini: GeminiQuota;
  /** PT 자정. 화면에는 KST로 옮겨 보여 줍니다. */
  nextResetAt: string;
  dayStartAt: string;
};

type TotalsRow = {
  youtube_units: number;
  youtube_calls: number;
  gemini_requests: number;
  gemini_prompt_tokens: number;
  gemini_output_tokens: number;
  day_start: string;
  next_reset: string;
};

type ByModelRow = {
  model_id: string;
  requests: number;
  prompt_tokens: number;
  output_tokens: number;
  failures: number;
};

/**
 * 오늘(PT) 남은 여유.
 *
 * 집계에 실패하면 throw하지 않고 "다 쓴 것처럼"이 아니라 "안 쓴 것처럼" 돌려줍니다 —
 * 사용량 표시가 안 된다고 기능을 막으면 본말전도입니다. 화면은 0을 보여 주고,
 * 진짜 한도는 API가 429로 알려 줍니다.
 */
export async function getQuota(): Promise<Quota> {
  const supabase = await createClient();

  const [totalsRes, byModelRes, models] = await Promise.all([
    supabase.rpc("api_usage_today").maybeSingle<TotalsRow>(),
    // 생성된 타입이 없어 supabase-js가 반환 모양을 알지 못합니다. 행 배열이 맞습니다.
    supabase.rpc("api_usage_by_model_today"),
    getModels(),
  ]);

  if (totalsRes.error) console.error("[quota] 총계 조회 실패:", totalsRes.error.message);
  if (byModelRes.error) console.error("[quota] 모델별 조회 실패:", byModelRes.error.message);

  const t = totalsRes.data;
  const bounds = await fallbackBounds(t);

  // YouTube
  const unitsLimit = CONFIG.youtubeDailyQuota();
  const unitsUsed = Number(t?.youtube_units ?? 0);
  const unitsRemaining = Math.max(0, unitsLimit - unitsUsed);
  const searchCost = UNITS["search.list"];
  const searchesRemaining = Math.floor(unitsRemaining / searchCost);

  // Gemini — 모델별
  const byModelRows = (byModelRes.data ?? []) as ByModelRow[];
  const byModel = new Map(byModelRows.map((r) => [r.model_id, r]));
  const modelQuotas: ModelQuota[] = models.map((m) => {
    const row = byModel.get(m.id);
    const used = Number(row?.requests ?? 0);
    const limit = m.dailyRequests;
    const remaining = limit === null ? null : Math.max(0, limit - used);

    return {
      id: m.id,
      label: m.label,
      description: m.description,
      requestsUsed: used,
      requestsLimit: limit,
      remaining,
      level: remaining === null ? null : levelOf(remaining, CONFIG.geminiWarnRequests()),
      failures: Number(row?.failures ?? 0),
    };
  });

  return {
    youtube: {
      unitsUsed,
      unitsLimit,
      unitsRemaining,
      searchesRemaining,
      calls: Number(t?.youtube_calls ?? 0),
      level: levelOf(searchesRemaining, CONFIG.youtubeWarnSearches()),
    },
    gemini: {
      requests: Number(t?.gemini_requests ?? 0),
      promptTokens: Number(t?.gemini_prompt_tokens ?? 0),
      outputTokens: Number(t?.gemini_output_tokens ?? 0),
      models: modelQuotas,
    },
    nextResetAt: bounds.nextReset,
    dayStartAt: bounds.dayStart,
  };
}

type Bounds = { dayStart: string; nextReset: string };

/**
 * 총계 조회가 실패했을 때도 리셋 시각만은 따로 받아 옵니다.
 * 「언제 풀리는지」는 사용량보다 더 중요한 정보라 같이 죽으면 안 됩니다.
 */
async function fallbackBounds(t: TotalsRow | null | undefined): Promise<Bounds> {
  if (t?.day_start && t?.next_reset) {
    return { dayStart: t.day_start, nextReset: t.next_reset };
  }
  return getPtBounds();
}

/** PT 경계만. 429 화면이 「리셋까지 얼마」를 보여 줄 때도 씁니다. */
export async function getPtBounds(): Promise<Bounds> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("pt_day_bounds")
    .maybeSingle<{ day_start: string; next_reset: string }>();

  if (error || !data) {
    console.error("[quota] 경계 조회 실패:", error?.message);
    // DB를 못 읽으면 리셋 시각을 알 수 없습니다. 빈 문자열로 두고 화면이 생략하게 합니다 —
    // 여기서 TS로 PT 자정을 추정하면 서머타임 전환일에 틀린 시각을 자신 있게 보여 주게 됩니다.
    return { dayStart: "", nextReset: "" };
  }
  return { dayStart: data.day_start, nextReset: data.next_reset };
}
