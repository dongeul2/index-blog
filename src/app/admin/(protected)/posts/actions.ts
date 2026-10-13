"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category, Source } from "@/lib/content-types";
import type { PostStatus } from "@/lib/post-status";
import { isRichDoc, richText, type RichDoc } from "@/lib/rich";
import { toSlug, uniqueSlug } from "@/lib/slug";

export type PostInput = {
  /** 편집 중인 글의 원래 slug. 새 글이면 null */
  originalSlug: string | null;
  slug: string;
  title: string;
  category: Category;
  status: PostStatus;
  source: Source;
  sourceRef: string;
  project: string;
  channel: string;
  summary: string;
  /** 쉼표로 구분한 입력을 그대로 받아 서버에서 정리합니다 */
  tags: string;
  /** 마크다운 본문(예전 글·자동 생성 글). doc이 있으면 서버가 doc의 평문으로 덮어씁니다 */
  body: string;
  /** 에디터 문서. 있으면 본문의 정본 */
  doc: RichDoc | null;
  /** ISO 문자열. 초안·큐는 없을 수 있습니다 */
  publishedAt: string | null;
};

export type SaveResult =
  | { ok: true; slug: string; savedAt: string }
  | { ok: false; error: string };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function clean(input: PostInput) {
  return {
    slug: input.slug.trim(),
    title: input.title.trim(),
    category: input.category,
    status: input.status,
    source: input.source,
    source_ref: input.sourceRef.trim() || null,
    project: input.project.trim() || null,
    channel: input.channel.trim() || null,
    summary: input.summary.trim(),
    tags: [
      ...new Set(
        input.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ],
    // 에디터로 쓴 글은 body에 평문을 둡니다 — 검색·읽는 시간·AI 요약이 그대로 동작합니다
    doc: isRichDoc(input.doc) ? input.doc : null,
    body: isRichDoc(input.doc) ? richText(input.doc) : input.body,
    published_at: input.publishedAt,
  };
}

/**
 * 저장.
 *
 * 권한은 두 겹입니다 — 여기서 한 번 막고, 통과해도 RLS가 다시 막습니다.
 * 이 확인은 보안이라기보다 **사람이 읽을 수 있는 오류**를 주기 위한 것이고,
 * 실제 경계는 정책입니다.
 */
export async function savePost(input: PostInput): Promise<SaveResult> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, error: "관리자만 저장할 수 있습니다." };

  const row = clean(input);

  if (!row.title) return { ok: false, error: "제목을 입력하세요." };

  const supabase = await createClient();

  // 주소를 비워 두면 제목으로 만듭니다(한글 제목이면 post-xxxxx)
  if (!row.slug) {
    const { data: taken } = await supabase.from("posts").select("slug");
    row.slug = uniqueSlug(toSlug(row.title, "post"), new Set((taken ?? []).map((r: { slug: string }) => r.slug)));
  }
  if (!SLUG.test(row.slug)) {
    return {
      ok: false,
      error: "주소(slug)는 영소문자·숫자·하이픈만 쓸 수 있습니다. 예: toc-observer",
    };
  }
  if (row.status === "published" && !row.published_at) {
    return { ok: false, error: "발행하려면 발행 시각이 필요합니다." };
  }

  const query = input.originalSlug
    ? supabase.from("posts").update(row).eq("slug", input.originalSlug).select("slug").single()
    : supabase
        .from("posts")
        .insert({ ...row, author_id: null })
        .select("slug")
        .single();

  const { data, error } = await query;

  if (error) {
    // 23505 = unique_violation
    if (error.code === "23505") {
      return { ok: false, error: `주소 "${row.slug}" 를 이미 다른 글이 쓰고 있습니다.` };
    }
    return { ok: false, error: error.message };
  }

  refreshSite(input.originalSlug, data.slug);
  return { ok: true, slug: data.slug, savedAt: new Date().toISOString() };
}

export async function deletePost(slug: string): Promise<{ ok: boolean; error?: string }> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, error: "관리자만 지울 수 있습니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };

  refreshSite(slug, null);
  return { ok: true };
}

/**
 * 공개 화면은 정적으로 만들어져 있어, 저장한 것이 그대로 보이려면 캐시를 무르게 해야 합니다.
 * 이게 없으면 글을 고쳐도 다시 빌드할 때까지 사이트에 반영되지 않습니다.
 *
 * 글 하나가 바뀌면 목록·아카이브·태그·홈이 함께 달라지므로 루트 레이아웃 단위로 무릅니다.
 */
function refreshSite(oldSlug: string | null, newSlug: string | null) {
  revalidatePath("/", "layout");
  // 정적 생성된 동적 경로는 패턴으로 한 번 더 짚어 줍니다.
  revalidatePath("/posts/[slug]", "page");
  revalidatePath("/tags/[tag]", "page");
  for (const slug of [oldSlug, newSlug]) {
    if (slug) revalidatePath(`/posts/${slug}`);
  }
  revalidatePath("/admin");
}
