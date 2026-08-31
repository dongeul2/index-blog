import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor, type EditorPost } from "../post-editor";
import { createClient } from "@/lib/supabase/server";
import { isCategory, type Category, type Source } from "@/lib/content-types";
import type { PostStatus } from "@/lib/post-status";

export const metadata: Metadata = {
  title: "글 편집",
  robots: { index: false, follow: false },
};

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 쿠키 클라이언트라 관리자 정책이 걸립니다 — 초안·큐도 열 수 있습니다.
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(
      "slug, title, category, status, source, source_ref, project, channel, summary, tags, body, published_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();

  const post: EditorPost = {
    originalSlug: data.slug,
    slug: data.slug,
    title: data.title,
    category: (isCategory(data.category) ? data.category : "essay") as Category,
    status: data.status as PostStatus,
    source: data.source as Source,
    sourceRef: data.source_ref ?? "",
    project: data.project ?? "",
    channel: data.channel ?? "",
    summary: data.summary ?? "",
    tags: (data.tags ?? []).join(", "),
    body: data.body ?? "",
    publishedAt: data.published_at,
  };

  return (
    <div className="page admin-page">
      <PostEditor post={post} />
    </div>
  );
}
