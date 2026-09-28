"use server";

import { getViewer } from "@/lib/auth";
import { generate } from "@/lib/ai/provider";
import { assistMessages, type AssistTask } from "@/lib/ai/prompts";
import { tagCounts } from "@/lib/posts";
import type { StreamError } from "@/lib/ai/shared";

/**
 * 에디터 보조 — 요약문·태그·제목 후보.
 *
 * 답이 짧아 스트리밍할 이유가 없으므로 라우트 핸들러가 아니라 서버 액션입니다.
 * 모델 선택·사용량 기록·429 분류는 어댑터(`lib/ai/provider.ts`)가 맡습니다.
 */

export type AssistResult =
  | { ok: true; task: "summary"; summary: string }
  | { ok: true; task: "tags"; tags: string }
  | { ok: true; task: "titles"; titles: string[] }
  | { ok: false; error: StreamError | { kind: "input"; message: string } };

/** 모델이 형식을 어겨도 입력칸에 쓸 수 있게 다듬습니다 — 따옴표·번호·글머리표를 걷어 냅니다. */
const strip = (s: string) =>
  s
    .trim()
    .replace(/^(\d+[.)]|[-*•])\s*/, "")
    .replace(/^["'「『]|["'」』]$/g, "")
    .trim();

export async function assist(
  task: AssistTask,
  post: { title: string; summary: string; body: string },
): Promise<AssistResult> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) {
    return { ok: false, error: { kind: "input", message: "관리자만 실행할 수 있습니다." } };
  }
  if (post.body.trim().length < 40) {
    return { ok: false, error: { kind: "input", message: "본문이 너무 짧습니다. 조금 더 쓴 뒤에 불러 주세요." } };
  }

  // 태그는 기존 표기와 맞춰야 태그 페이지가 쪼개지지 않습니다. 많이 쓰는 것부터 40개면 충분합니다.
  const knownTags =
    task === "tags" ? (await tagCounts()).slice(0, 40).map((t) => t.value) : undefined;

  const { system, input } = assistMessages(task, { ...post, knownTags });
  const result = await generate({ task, system, input });
  if (!result.ok) return { ok: false, error: result.error };

  const lines = result.text
    .split("\n")
    .map(strip)
    .filter(Boolean);

  switch (task) {
    case "summary":
      return { ok: true, task, summary: lines[0] ?? "" };
    case "tags": {
      const tags = [
        ...new Set(
          lines
            .join(",")
            .split(/[,，、]/)
            .map((t) => strip(t).replace(/^#/, "").toLowerCase())
            .filter(Boolean),
        ),
      ].slice(0, 8);
      return { ok: true, task, tags: tags.join(", ") };
    }
    case "titles":
      return { ok: true, task, titles: lines.slice(0, 5) };
  }
}
