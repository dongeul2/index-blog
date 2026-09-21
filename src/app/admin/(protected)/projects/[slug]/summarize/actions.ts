"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * 초안 저장.
 *
 * 생성 자체는 스트리밍이라 라우트 핸들러(`/api/summarize`)가 맡습니다.
 * 여기는 결과를 글로 앉히는 자리입니다.
 *
 * 예상 비용 계산은 걷어냈습니다 — Anthropic일 때는 달러를 보여 주려고 있었지만,
 * Gemini 무료 등급에서 의미 있는 숫자는 달러가 아니라 「n회 남음」이고
 * 그건 우리 사용량 로그에서 나옵니다. API를 한 번 더 부를 이유가 없습니다.
 */

export type SaveDraftResult = { ok: true; slug: string } | { ok: false; error: string };

/** slug 후보: 영숫자만 남기고, 한글 제목이면 날짜 기반으로 떨어집니다. */
function slugify(title: string, projectSlug: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (base.length >= 3) return base.slice(0, 60);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  return `${projectSlug}-${day}`;
}

/** 생성된 초안을 글로 저장합니다. 발행하지 않습니다 — 11 에디터에서 다듬을 것을 전제합니다. */
export async function saveDraft(input: {
  projectSlug: string;
  title: string;
  summary: string;
  body: string;
}): Promise<SaveDraftResult> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, error: "관리자만 저장할 수 있습니다." };
  if (!input.title.trim()) return { ok: false, error: "제목이 비어 있습니다." };

  const supabase = await createClient();
  let slug = slugify(input.title, input.projectSlug);

  // 같은 날 두 번 만들면 슬러그가 겹칩니다. 뒤에 번호를 붙입니다.
  for (let n = 2; n <= 20; n++) {
    const { data } = await supabase.from("posts").select("slug").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${slugify(input.title, input.projectSlug)}-${n}`;
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      slug,
      title: input.title.trim(),
      category: "devlog",
      status: "draft",
      source: "slack-claude-code",
      project: input.projectSlug,
      summary: input.summary.trim(),
      body: input.body,
      tags: [],
    })
    .select("slug")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true, slug: data.slug };
}
