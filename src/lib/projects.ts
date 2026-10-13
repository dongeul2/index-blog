import { cache } from "react";
import { supabasePublic } from "./supabase/public";
import type {
  Channel,
  Commit,
  Decision,
  Experience,
  GalleryImage,
  Metric,
  Profile,
  Project,
  ProjectKind,
  ProjectSkill,
  ProjectStatus,
  PullRequest,
  RepoLink,
  PrState,
  Skill,
  SkillCategory,
} from "./project-types";
import { EMPTY_PROFILE } from "./project-types";
import { isRichDoc } from "./rich";

export * from "./project-types";

/**
 * 프로젝트·채널 읽기 (공개 화면용).
 *
 * `posts.ts`와 같은 규칙입니다 — 쿠키를 건드리지 않는 anon 클라이언트를 써서
 * 정적 생성을 유지하고, 무엇이 보이는지는 RLS가 정합니다.
 */

// 한 줄짜리 리터럴이어야 supabase-js가 select 문자열에서 행 타입을 추론합니다
const PROJECT_COLUMNS =
  "slug, name, description, repo, status, link_state, branch, language, repo_public, last_activity, synced_at, image_url, site_url, kind, experience_id, role, period_start, period_end, team_size, metrics, decisions, confidential, featured, sort_order, overview, accent, image_alt, gallery, story";

type ProjectRow = {
  slug: string;
  name: string;
  description: string;
  repo: string | null;
  status: string;
  link_state: string;
  branch: string | null;
  language: string | null;
  repo_public: boolean;
  last_activity: string | null;
  synced_at: string | null;
  image_url: string | null;
  site_url: string | null;
  kind: string;
  experience_id: number | null;
  role: string | null;
  period_start: string | null;
  period_end: string | null;
  team_size: number | null;
  metrics: Metric[];
  decisions: Decision[];
  confidential: boolean;
  featured: boolean;
  sort_order: number;
  overview: string;
  accent: string | null;
  image_alt: string | null;
  gallery: GalleryImage[];
  story: unknown;
};

const toProject = (row: ProjectRow): Project => ({
  slug: row.slug,
  name: row.name,
  description: row.description,
  repo: row.repo,
  status: row.status as ProjectStatus,
  linkState: row.link_state as RepoLink,
  branch: row.branch,
  language: row.language,
  repoPublic: row.repo_public,
  lastActivity: row.last_activity,
  syncedAt: row.synced_at,
  // 기밀 프로젝트는 데이터 계층에서 이미 걷어 냅니다 — 화면마다 조건을 다는 대신 한 곳에서
  imageUrl: row.confidential ? null : row.image_url,
  siteUrl: row.confidential ? null : row.site_url,
  kind: row.kind as ProjectKind,
  experienceId: row.experience_id,
  role: row.role,
  periodStart: row.period_start,
  periodEnd: row.period_end,
  teamSize: row.team_size,
  metrics: row.metrics ?? [],
  decisions: row.decisions ?? [],
  confidential: row.confidential,
  featured: row.featured,
  sortOrder: row.sort_order,
  overview: row.overview,
  accent: row.accent,
  imageAlt: row.image_alt,
  gallery: row.confidential ? [] : (row.gallery ?? []),
  story: isRichDoc(row.story) ? row.story : null,
});

/** 최근 활동순. 활동 기록이 없는 프로젝트는 뒤로 보냅니다. */
export const getProjects = cache(async (): Promise<Project[]> => {
  const { data, error } = await supabasePublic
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("last_activity", { ascending: false, nullsFirst: false })
    .order("name");

  if (error) throw new Error(`프로젝트를 불러오지 못했습니다: ${error.message}`);
  return (data as ProjectRow[]).map(toProject);
});

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getProjects()).find((p) => p.slug === slug);
}

export async function activeProjects(): Promise<Project[]> {
  return (await getProjects()).filter((p) => p.status === "active");
}

export async function archivedProjects(): Promise<Project[]> {
  return (await getProjects()).filter((p) => p.status === "archived");
}

/** 04 검색 결과 — 이름 · 설명 · 저장소 이름에서 찾습니다. */
export async function searchProjects(query: string): Promise<Project[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return (await getProjects()).filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.repo ?? "").toLowerCase().includes(q),
  );
}

/* ---------- 저장소 스냅샷 (2단계에서 GitHub이 채웁니다) ---------- */

export async function getCommits(projectSlug: string, limit = 5): Promise<Commit[]> {
  const { data, error } = await supabasePublic
    .from("repo_commits")
    .select("sha, message, author, committed_at, url")
    .eq("project_slug", projectSlug)
    .order("committed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`커밋을 불러오지 못했습니다: ${error.message}`);
  return data.map((r) => ({
    sha: r.sha,
    message: r.message,
    author: r.author,
    at: r.committed_at,
    url: r.url,
  }));
}

export async function getPulls(projectSlug: string, limit = 5): Promise<PullRequest[]> {
  const { data, error } = await supabasePublic
    .from("repo_pulls")
    .select("number, title, state, url, at")
    .eq("project_slug", projectSlug)
    .order("at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Pull Request를 불러오지 못했습니다: ${error.message}`);
  return data.map((r) => ({
    number: r.number,
    title: r.title,
    state: r.state as PrState,
    url: r.url,
    at: r.at,
  }));
}

/**
 * README. 정책이 가리면 행 자체가 오지 않습니다 — 앱이 공개 여부를 따로 판단하지 않습니다.
 */
export async function getReadme(projectSlug: string): Promise<string | null> {
  const { data, error } = await supabasePublic
    .from("repo_readmes")
    .select("content")
    .eq("project_slug", projectSlug)
    .maybeSingle();

  if (error) throw new Error(`README를 불러오지 못했습니다: ${error.message}`);
  return data?.content ?? null;
}

/* ---------- 채널 ---------- */

export const getChannels = cache(async (): Promise<Channel[]> => {
  const { data, error } = await supabasePublic
    .from("channels")
    .select("id, name, handle, url, note")
    .order("name");

  if (error) throw new Error(`채널을 불러오지 못했습니다: ${error.message}`);
  return data as Channel[];
});

export async function getChannel(id: string): Promise<Channel | undefined> {
  return (await getChannels()).find((c) => c.id === id);
}

/* ---------- 포트폴리오: 경력 · 역량 ---------- */

/** 최근 경력이 위로 */
export const getExperiences = cache(async (): Promise<Experience[]> => {
  const { data, error } = await supabasePublic
    .from("experiences")
    .select("id, organization, title, period_start, period_end, summary, highlights, confidential")
    .order("sort_order")
    .order("period_start", { ascending: false });

  if (error) throw new Error(`경력을 불러오지 못했습니다: ${error.message}`);
  return data.map((r) => ({
    id: r.id,
    organization: r.organization,
    title: r.title,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    summary: r.summary,
    highlights: r.highlights,
    confidential: r.confidential,
  }));
});

export const getSkills = cache(async (): Promise<Skill[]> => {
  const { data, error } = await supabasePublic
    .from("skills")
    .select("slug, name, category, description")
    .order("sort_order")
    .order("name");

  if (error) throw new Error(`역량을 불러오지 못했습니다: ${error.message}`);
  return data.map((r) => ({ ...r, category: r.category as SkillCategory }));
});

export const getProjectSkills = cache(async (): Promise<ProjectSkill[]> => {
  const { data, error } = await supabasePublic
    .from("project_skills")
    .select("project_slug, skill_slug, note");

  if (error) throw new Error(`프로젝트 역량을 불러오지 못했습니다: ${error.message}`);
  return data.map((r) => ({ projectSlug: r.project_slug, skillSlug: r.skill_slug, note: r.note }));
});

export const getProfile = cache(async (): Promise<Profile> => {
  const { data, error } = await supabasePublic
    .from("profile")
    .select("name, name_latin, tagline, intro, birth, location, education, email, github")
    .maybeSingle();

  if (error) throw new Error(`인적 사항을 불러오지 못했습니다: ${error.message}`);
  if (!data) return EMPTY_PROFILE;
  return {
    name: data.name,
    nameLatin: data.name_latin,
    tagline: data.tagline,
    intro: data.intro,
    birth: data.birth,
    location: data.location,
    education: data.education,
    email: data.email,
    github: data.github,
  };
});
