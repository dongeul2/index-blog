"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  failureMessage,
  fetchCommits,
  fetchPulls,
  fetchReadme,
  fetchRepo,
} from "@/lib/github";

export type SyncResult =
  | { ok: true; commits: number; pulls: number; readme: boolean; private: boolean }
  | { ok: false; error: string; unlinked: boolean };

/**
 * 저장소를 GitHub에서 한 번 읽어 옵니다.
 *
 * 실패하면 `link_state`를 `unlinked`로 내립니다 — **토큰 만료가 조용히 지나가지 않게**
 * 하는 것이 핵심입니다. 프로젝트 목록·상세·대시보드가 그 상태를 그대로 보여 줍니다.
 * 이미 받아 둔 커밋·PR은 지우지 않습니다. 낡았을지언정 없는 것보다 낫습니다.
 */
export async function syncProject(slug: string): Promise<SyncResult> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, error: "관리자만 실행할 수 있습니다.", unlinked: false };

  const supabase = await createClient();

  const { data: project, error: loadError } = await supabase
    .from("projects")
    .select("slug, repo")
    .eq("slug", slug)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message, unlinked: false };
  if (!project) return { ok: false, error: "프로젝트를 찾을 수 없습니다.", unlinked: false };
  if (!project.repo) {
    return { ok: false, error: "저장소를 먼저 연결하세요. (owner/repo)", unlinked: false };
  }

  const repo = project.repo as string;

  // 저장소 정보를 먼저 받습니다. 여기서 실패하면 나머지도 실패하므로 일찍 멈춥니다.
  const meta = await fetchRepo(repo);
  if (!meta.ok) {
    await markUnlinked(supabase, slug);
    return { ok: false, error: failureMessage(meta), unlinked: true };
  }

  const [readme, commits, pulls] = await Promise.all([
    fetchReadme(repo),
    fetchCommits(repo),
    fetchPulls(repo),
  ]);

  for (const result of [readme, commits, pulls]) {
    if (!result.ok) {
      await markUnlinked(supabase, slug);
      return { ok: false, error: failureMessage(result), unlinked: true };
    }
  }
  if (!readme.ok || !commits.ok || !pulls.ok) {
    return { ok: false, error: "알 수 없는 오류", unlinked: false };
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      branch: meta.data.defaultBranch,
      language: meta.data.language,
      last_activity: meta.data.pushedAt,
      link_state: "linked",
      synced_at: now,
    })
    .eq("slug", slug);

  if (updateError) return { ok: false, error: updateError.message, unlinked: false };

  if (readme.data !== null) {
    await supabase
      .from("repo_readmes")
      .upsert({ project_slug: slug, content: readme.data, fetched_at: now });
  } else {
    await supabase.from("repo_readmes").delete().eq("project_slug", slug);
  }

  // 통째로 갈아끼웁니다 — 강제 푸시로 사라진 커밋이 남아 있으면 안 됩니다.
  await supabase.from("repo_commits").delete().eq("project_slug", slug);
  if (commits.data.length > 0) {
    await supabase.from("repo_commits").insert(
      commits.data.map((c) => ({
        project_slug: slug,
        sha: c.sha,
        message: c.message,
        author: c.author,
        committed_at: c.committedAt,
        url: c.url,
      })),
    );
  }

  await supabase.from("repo_pulls").delete().eq("project_slug", slug);
  if (pulls.data.length > 0) {
    await supabase.from("repo_pulls").insert(
      pulls.data.map((p) => ({
        project_slug: slug,
        number: p.number,
        title: p.title,
        state: p.state,
        url: p.url,
        at: p.at,
      })),
    );
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/projects");

  return {
    ok: true,
    commits: commits.data.length,
    pulls: pulls.data.length,
    readme: readme.data !== null,
    private: meta.data.private,
  };
}

type Db = Awaited<ReturnType<typeof createClient>>;

async function markUnlinked(supabase: Db, slug: string) {
  await supabase.from("projects").update({ link_state: "unlinked" }).eq("slug", slug);
  revalidatePath("/", "layout");
  revalidatePath("/admin/projects");
}
