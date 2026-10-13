"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_DATA_TAG } from "@/lib/supabase/public";
import { toSlug, uniqueSlug } from "@/lib/slug";
import type {
  Decision,
  GalleryImage,
  Metric,
  Profile,
  ProjectKind,
  SkillCategory,
} from "@/lib/project-types";

/**
 * 홈에서 바로 편집 — 서버 액션.
 *
 * 화면(편집 버튼)은 브라우저에서 관리자 여부를 보고 띄우지만, 그건 편의일 뿐입니다.
 * 여기서 매번 서버가 다시 확인하고, 그 뒤에도 RLS가 한 번 더 막습니다.
 * 저장 뒤에는 공개 화면의 DB 캐시를 즉시 만료시켜(updateTag) 새로고침 없이 바로 보이게 합니다.
 */

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function adminClient() {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return null;
  return createClient();
}

function refresh() {
  updateTag(PUBLIC_DATA_TAG);
  revalidatePath("/");
}

const DENIED = { ok: false as const, error: "관리자로 로그인해야 저장할 수 있습니다." };
const trim = (v: string | null | undefined) => (v ?? "").trim();
const orNull = (v: string | null | undefined) => trim(v) || null;
/** `2024-11` → `2024-11-01`. 월 입력(type=month)을 날짜 컬럼에 맞춥니다 */
const monthToDate = (v: string | null | undefined) => (trim(v) ? `${trim(v).slice(0, 7)}-01` : null);

/* ---------- 인적 사항 ---------- */

export async function saveProfile(input: Profile): Promise<ActionResult> {
  const db = await adminClient();
  if (!db) return DENIED;

  const { error } = await db.from("profile").upsert({
    id: 1,
    name: trim(input.name),
    name_latin: trim(input.nameLatin),
    tagline: trim(input.tagline),
    intro: trim(input.intro),
    birth: trim(input.birth),
    location: trim(input.location),
    education: trim(input.education),
    email: trim(input.email),
    github: trim(input.github).replace(/^https?:\/\/github\.com\//, ""),
  });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/* ---------- 역량 ---------- */

export type SkillInput = {
  /** 비우면 새 역량 */
  slug?: string;
  name: string;
  category: SkillCategory;
  description: string;
};

export async function saveSkill(input: SkillInput): Promise<ActionResult<{ slug: string }>> {
  const db = await adminClient();
  if (!db) return DENIED;
  const name = trim(input.name);
  if (!name) return { ok: false, error: "역량 이름을 입력하세요." };

  let slug = input.slug;
  if (!slug) {
    const { data } = await db.from("skills").select("slug");
    slug = uniqueSlug(toSlug(name, "s"), new Set((data ?? []).map((r: { slug: string }) => r.slug)));
  }

  const { error } = await db.from("skills").upsert({
    slug,
    name,
    category: input.category,
    description: trim(input.description),
  });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: { slug } };
}

export async function deleteSkill(slug: string): Promise<ActionResult> {
  const db = await adminClient();
  if (!db) return DENIED;
  const { error } = await db.from("skills").delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/* ---------- 경력 ---------- */

export type ExperienceInput = {
  id?: number;
  organization: string;
  title: string;
  /** YYYY-MM */
  periodStart: string;
  /** YYYY-MM, 비우면 재직 중 */
  periodEnd: string;
  summary: string;
  highlights: string[];
  confidential: boolean;
};

export async function saveExperience(input: ExperienceInput): Promise<ActionResult> {
  const db = await adminClient();
  if (!db) return DENIED;
  if (!trim(input.organization)) return { ok: false, error: "회사 이름을 입력하세요." };
  if (!trim(input.title)) return { ok: false, error: "직함을 입력하세요." };
  if (!trim(input.periodStart)) return { ok: false, error: "시작한 달을 고르세요." };

  const row = {
    organization: trim(input.organization),
    title: trim(input.title),
    period_start: monthToDate(input.periodStart),
    period_end: monthToDate(input.periodEnd),
    summary: trim(input.summary),
    highlights: input.highlights.map(trim).filter(Boolean),
    confidential: input.confidential,
  };
  const { error } = input.id
    ? await db.from("experiences").update(row).eq("id", input.id)
    : await db.from("experiences").insert(row);
  if (error) return { ok: false, error: friendly(error.message) };
  refresh();
  return { ok: true };
}

export async function deleteExperience(id: number): Promise<ActionResult> {
  const db = await adminClient();
  if (!db) return DENIED;
  const { error } = await db.from("experiences").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/* ---------- 프로젝트 ---------- */

export type ProjectInput = {
  /** 비우면 새 프로젝트 — 이름으로 주소를 만듭니다 */
  slug?: string;
  name: string;
  description: string;
  overview: string;
  kind: ProjectKind;
  experienceId: number | null;
  role: string;
  periodStart: string;
  periodEnd: string;
  teamSize: number | null;
  featured: boolean;
  confidential: boolean;
  accent: string;
  imageUrl: string;
  imageAlt: string;
  gallery: GalleryImage[];
  metrics: Metric[];
  decisions: Decision[];
  siteUrl: string;
  repo: string;
  repoPublic: boolean;
  skills: string[];
};

export async function saveProject(input: ProjectInput): Promise<ActionResult<{ slug: string }>> {
  const db = await adminClient();
  if (!db) return DENIED;

  const name = trim(input.name);
  if (!name) return { ok: false, error: "프로젝트 이름을 입력하세요." };
  const repo = trim(input.repo);
  if (repo && !/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(repo)) {
    return { ok: false, error: "저장소는 owner/repo 형식으로 적어 주세요. 예: dongeul2/index-blog" };
  }
  const site = trim(input.siteUrl);
  if (site && !/^https?:\/\//.test(site)) return { ok: false, error: "사이트 주소는 https:// 로 시작해야 합니다." };
  const accent = trim(input.accent);
  if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) return { ok: false, error: "강조색 형식이 올바르지 않습니다." };

  let slug = input.slug;
  if (!slug) {
    const { data } = await db.from("projects").select("slug");
    slug = uniqueSlug(toSlug(name), new Set((data ?? []).map((r: { slug: string }) => r.slug)));
  }

  const row = {
    slug,
    name,
    description: trim(input.description),
    overview: trim(input.overview),
    kind: input.kind,
    experience_id: input.kind === "work" ? input.experienceId : null,
    role: orNull(input.role),
    period_start: monthToDate(input.periodStart),
    period_end: monthToDate(input.periodEnd),
    team_size: input.teamSize && input.teamSize > 0 ? input.teamSize : null,
    featured: input.featured,
    confidential: input.confidential,
    accent: accent || null,
    image_url: orNull(input.imageUrl),
    image_alt: orNull(input.imageAlt),
    gallery: input.gallery.filter((g) => trim(g.src)),
    metrics: input.metrics.filter((m) => trim(m.label) && trim(m.value)),
    decisions: input.decisions.filter((d) => trim(d.title)),
    site_url: site || null,
    repo: repo || null,
    repo_public: repo ? input.repoPublic : false,
  };

  const { error } = input.slug
    ? await db.from("projects").update(row).eq("slug", input.slug)
    : await db.from("projects").insert(row);
  if (error) return { ok: false, error: friendly(error.message) };

  // 역량 연결은 통째로 바꿉니다 — 몇 개 안 되고, 차이를 계산하는 것보다 틀릴 여지가 적습니다
  const { error: delError } = await db.from("project_skills").delete().eq("project_slug", slug);
  if (delError) return { ok: false, error: delError.message };
  if (input.skills.length > 0) {
    const { error: linkError } = await db
      .from("project_skills")
      .insert(input.skills.map((skill_slug) => ({ project_slug: slug, skill_slug })));
    if (linkError) return { ok: false, error: linkError.message };
  }

  refresh();
  return { ok: true, data: { slug } };
}

export async function deleteProject(slug: string): Promise<ActionResult> {
  const db = await adminClient();
  if (!db) return DENIED;
  const { error } = await db.from("projects").delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** DB 제약 위반 메시지를 사람이 읽을 말로 */
function friendly(message: string): string {
  if (message.includes("period_check")) return "끝난 달이 시작한 달보다 앞설 수 없습니다.";
  if (message.includes("experience_only_work")) return "회사 프로젝트만 경력에 연결할 수 있습니다.";
  return message;
}
