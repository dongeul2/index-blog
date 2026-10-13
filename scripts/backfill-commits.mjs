/**
 * 프로젝트의 커밋 캐시(repo_commits)를 GitHub 기록 전체(최대 500개)로 다시 채웁니다.
 *
 *   node --env-file=.env.local scripts/backfill-commits.mjs index-blog
 *
 * 평소에는 관리자 화면의 「지금 가져오기」가 같은 일을 합니다(sync.ts). 이 스크립트는
 * 로그인 없이 한 번에 채워야 할 때 — 예컨대 동기화 범위를 넓힌 직후 — 쓰는 운영 도구입니다.
 * service_role 키를 쓰므로 내 컴퓨터에서만 돌립니다.
 */
import { createClient } from "@supabase/supabase-js";

const slug = process.argv[2];
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, GITHUB_TOKEN: token } = process.env;
if (!slug || !url || !key || !token) {
  console.error("사용법: node --env-file=.env.local scripts/backfill-commits.mjs <프로젝트-slug>");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const { data: project, error } = await db.from("projects").select("repo").eq("slug", slug).single();
if (error || !project?.repo) {
  console.error(`프로젝트 ${slug}의 저장소를 찾지 못했습니다.`, error?.message ?? "");
  process.exit(1);
}

const commits = [];
for (let page = 1; commits.length < 500; page++) {
  const res = await fetch(`https://api.github.com/repos/${project.repo}/commits?per_page=100&page=${page}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const batch = await res.json();
  commits.push(...batch);
  if (batch.length < 100) break;
}

const rows = commits.map((c) => ({
  project_slug: slug,
  sha: c.sha,
  message: (c.commit.message ?? "").split("\n")[0],
  author: c.author?.login ?? c.commit.author?.name ?? null,
  committed_at: c.commit.author?.date ?? new Date().toISOString(),
  url: c.html_url,
}));

await db.from("repo_commits").delete().eq("project_slug", slug);
const { error: insertError } = await db.from("repo_commits").insert(rows);
if (insertError) throw new Error(insertError.message);
console.log(`${slug}: 커밋 ${rows.length}개를 채웠습니다 (${project.repo}).`);
