import { createClient } from "./supabase/server";
import { CATEGORY_LABEL, type Category, isCategory } from "./content-types";
import { isStatus, type PostStatus } from "./post-status";

// 상태 라벨·배지는 클라이언트도 써야 해서 post-status.ts에 있습니다.
export * from "./post-status";

/**
 * 관리자용 글 조회.
 *
 * `supabase/server`의 쿠키 클라이언트를 씁니다 — 로그인한 사람으로서 질의하므로
 * RLS의 관리자 정책이 걸려 초안·예약·실패까지 전부 보입니다.
 * 공개 화면이 쓰는 anon 클라이언트로는 발행글만 보입니다.
 */

export type AdminPost = {
  slug: string;
  title: string;
  category: Category;
  status: PostStatus;
  summary: string;
  tags: string[];
  generated: boolean;
  /** null이면 아직 발행 시각이 정해지지 않은 글(초안·큐) */
  publishedAt: string | null;
  /** 발행 시각이 미래 = 예약 발행 */
  scheduled: boolean;
  updatedAt: string;
};

type Row = {
  slug: string;
  title: string;
  category: string;
  status: string;
  summary: string | null;
  tags: string[] | null;
  is_generated: boolean;
  published_at: string | null;
  updated_at: string;
};

function toAdminPost(row: Row, now: number): AdminPost {
  const publishedAt = row.published_at;
  return {
    slug: row.slug,
    title: row.title,
    category: isCategory(row.category) ? row.category : "essay",
    status: isStatus(row.status) ? row.status : "draft",
    summary: row.summary ?? "",
    tags: row.tags ?? [],
    generated: row.is_generated,
    publishedAt,
    scheduled: Boolean(publishedAt && new Date(publishedAt).getTime() > now),
    updatedAt: row.updated_at,
  };
}

/**
 * 전체 글. 최근에 손댄 순입니다 — 대시보드는 "무엇이 발행되었나"보다
 * "무엇을 하다 말았나"를 먼저 보여줘야 합니다.
 */
export async function getAdminPosts(): Promise<AdminPost[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("slug, title, category, status, summary, tags, is_generated, published_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`글을 불러오지 못했습니다: ${error.message}`);

  const now = Date.now();
  return (data as Row[]).map((row) => toAdminPost(row, now));
}

export function countByStatus(posts: AdminPost[]): Record<PostStatus, number> {
  const counts: Record<PostStatus, number> = { draft: 0, queued: 0, published: 0, failed: 0 };
  for (const p of posts) counts[p.status]++;
  return counts;
}

export { CATEGORY_LABEL };
