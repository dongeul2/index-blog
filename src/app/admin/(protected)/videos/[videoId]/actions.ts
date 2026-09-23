"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * 초안 저장.
 *
 * 생성 자체는 스트리밍이라 라우트 핸들러(`/api/summarize-video`)가 맡습니다.
 * 여기는 결과를 글로 앉히는 자리입니다 — `projects/[slug]/summarize/actions.ts`의
 * `saveDraft`와 같은 모양입니다.
 */

export type SaveVideoDraftResult = { ok: true; slug: string } | { ok: false; error: string };

/** slug 후보: 영숫자만 남기고, 짧으면 videoId로 떨어집니다. */
function slugify(title: string, videoId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (base.length >= 3) return base.slice(0, 60);
  return `video-${videoId.toLowerCase()}`;
}

/** 생성된 초안을 글로 저장합니다. 발행하지 않습니다 — 11 에디터에서 다듬을 것을 전제합니다. */
export async function saveVideoDraft(input: {
  videoId: string;
  channelId: string;
  title: string;
  summary: string;
  body: string;
}): Promise<SaveVideoDraftResult> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, error: "관리자만 저장할 수 있습니다." };
  if (!input.title.trim()) return { ok: false, error: "제목이 비어 있습니다." };

  const supabase = await createClient();
  let slug = slugify(input.title, input.videoId);

  // 같은 제목으로 두 번 만들면 슬러그가 겹칩니다. 뒤에 번호를 붙입니다.
  for (let n = 2; n <= 20; n++) {
    const { data } = await supabase.from("posts").select("slug").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${slugify(input.title, input.videoId)}-${n}`;
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      slug,
      title: input.title.trim(),
      category: "video",
      status: "draft",
      source: "youtube-summary",
      source_ref: input.videoId,
      channel: input.channelId || null,
      summary: input.summary.trim(),
      body: input.body,
      tags: [],
    })
    .select("slug")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/videos");
  return { ok: true, slug: data.slug };
}
