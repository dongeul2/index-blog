import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SummarizePanel } from "./summarize-panel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "작업 요약",
  robots: { index: false, follow: false },
};

export default async function SummarizePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 쿠키 클라이언트라 관리자 정책이 걸립니다 — 비공개 저장소의 커밋도 볼 수 있습니다.
  const supabase = await createClient();

  const [{ data: project }, { data: commits }] = await Promise.all([
    supabase.from("projects").select("slug, name, repo").eq("slug", slug).maybeSingle(),
    supabase
      .from("repo_commits")
      .select("sha, message, committed_at")
      .eq("project_slug", slug)
      .order("committed_at", { ascending: false })
      .limit(50),
  ]);

  if (!project) notFound();

  return (
    <div className="page admin-page">
      <SummarizePanel
        projectSlug={project.slug}
        projectName={project.name}
        repo={project.repo ?? ""}
        commits={(commits ?? []).map((c) => ({
          sha: c.sha,
          message: c.message,
          committedAt: c.committed_at,
        }))}
      />
    </div>
  );
}
