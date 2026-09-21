import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AiTask } from "./shared";

/**
 * 모델 목록과 작업별 기본값.
 *
 * 코드가 아니라 DB(`ai_models` / `ai_tasks`)에서 읽습니다. Gemini 모델명은 몇 달 단위로
 * 바뀌고, Google은 모델별 한도 수치를 아예 공개하지 않습니다("AI Studio에서 확인하라").
 * 코드에 박아두면 모델이 은퇴하거나 한도가 조정될 때마다 배포를 다시 해야 합니다.
 */

export type AiModel = {
  id: string;
  label: string;
  description: string;
  /** RPD. null이면 한도 미상 — 잔여를 표시하지 않습니다(추정치로 채우지 않습니다). */
  dailyRequests: number | null;
  sortOrder: number;
};

/**
 * DB를 못 읽었을 때의 최후 수단.
 *
 * 이건 하드코딩이 아니라 폴백입니다 — 설정 테이블이 비어도 AI 기능이 완전히 죽지는
 * 않게 하는 한 줄입니다. 평소에는 절대 쓰이지 않습니다.
 */
export const FALLBACK_MODEL = "gemini-3.8-flash";

export const getModels = cache(async (): Promise<AiModel[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_models")
    .select("id, label, description, daily_requests, sort_order")
    .eq("enabled", true)
    .order("sort_order");

  if (error || !data) {
    console.error("[ai] 모델 목록을 읽지 못했습니다:", error?.message);
    return [];
  }

  return data.map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
    dailyRequests: r.daily_requests,
    sortOrder: r.sort_order,
  }));
});

export type TaskDefault = { task: AiTask; label: string; modelId: string; sortOrder: number };

export const getTaskDefaults = cache(async (): Promise<TaskDefault[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_tasks")
    .select("task, label, model_id, sort_order")
    .order("sort_order");

  if (error || !data) {
    console.error("[ai] 작업 기본값을 읽지 못했습니다:", error?.message);
    return [];
  }

  return data.map((r) => ({
    task: r.task as AiTask,
    label: r.label,
    modelId: r.model_id,
    sortOrder: r.sort_order,
  }));
});

/**
 * 이 호출에 쓸 모델을 정합니다.
 *
 * 우선순위: 사용자가 드롭다운에서 고른 것 → 작업별 기본값 → 폴백.
 * 고른 모델이 목록에 없으면(은퇴했거나 비활성) 기본값으로 떨어집니다 —
 * 오래된 탭에서 보낸 요청이 죽은 모델을 부르지 않게 합니다.
 */
export async function resolveModel(task: AiTask, override?: string): Promise<string> {
  const [models, defaults] = await Promise.all([getModels(), getTaskDefaults()]);

  if (override && models.some((m) => m.id === override)) return override;

  const fromTask = defaults.find((d) => d.task === task)?.modelId;
  if (fromTask && models.some((m) => m.id === fromTask)) return fromTask;

  return models[0]?.id ?? FALLBACK_MODEL;
}

/** 드롭다운에 보여 줄 이름. 모르는 ID면 ID를 그대로 씁니다. */
export async function labelOf(modelId: string): Promise<string> {
  const models = await getModels();
  return models.find((m) => m.id === modelId)?.label ?? modelId;
}
