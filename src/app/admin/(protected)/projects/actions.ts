"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  REPO_PATTERN,
  SLUG_PATTERN,
  type ProjectStatus,
  type RepoLink,
} from "@/lib/project-types";

export type ProjectInput = {
  /** 편집 중인 프로젝트의 원래 slug. 새로 만들면 null */
  originalSlug: string | null;
  slug: string;
  name: string;
  description: string;
  /** 빈 문자열이면 연결하지 않은 것으로 봅니다 */
  repo: string;
  status: ProjectStatus;
  /** README·커밋·PR을 공개 화면에 보일지 */
  repoPublic: boolean;
  /** 카드·상세 커버 이미지 URL. 빈 문자열이면 이미지 없음 */
  imageUrl: string;
  /** 라이브 데모 등 바로가기 링크. 빈 문자열이면 링크 없음 */
  siteUrl: string;
};

/** 빈 문자열은 null로, 값이 있으면 http(s) URL인지만 확인합니다(업로드 없이 참조만). */
function normalizeUrlField(value: string): { ok: true; value: string | null } | { ok: false } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  return /^https?:\/\/.+/i.test(trimmed) ? { ok: true, value: trimmed } : { ok: false };
}

export type ProjectResult = { ok: true; slug: string } | { ok: false; error: string };

/** slug가 이미 쓰이고 있는지. 15 화면의 "검사중 / 사용 가능 / 이미 있음" 표시에 씁니다. */
export async function checkSlug(
  slug: string,
  exclude: string | null,
): Promise<{ available: boolean; reason?: string }> {
  const value = slug.trim();
  if (!value) return { available: false, reason: "주소를 입력하세요." };
  if (!SLUG_PATTERN.test(value)) {
    return { available: false, reason: "영소문자·숫자·하이픈만 쓸 수 있습니다." };
  }
  if (exclude && value === exclude) return { available: true };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("slug")
    .eq("slug", value)
    .maybeSingle();

  if (error) return { available: false, reason: error.message };
  return data ? { available: false, reason: "이미 쓰이고 있는 주소입니다." } : { available: true };
}

export async function saveProject(input: ProjectInput): Promise<ProjectResult> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, error: "관리자만 저장할 수 있습니다." };

  const slug = input.slug.trim();
  const name = input.name.trim();
  const repo = input.repo.trim();

  if (!name) return { ok: false, error: "이름을 입력하세요." };
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, error: "주소는 영소문자·숫자·하이픈만 쓸 수 있습니다. 예: index-blog" };
  }
  if (repo && !REPO_PATTERN.test(repo)) {
    return { ok: false, error: "저장소는 owner/repo 형식이어야 합니다. 예: dongeul2/index-blog" };
  }

  const image = normalizeUrlField(input.imageUrl);
  if (!image.ok) return { ok: false, error: "커버 이미지는 http(s):// 로 시작하는 URL이어야 합니다." };
  const site = normalizeUrlField(input.siteUrl);
  if (!site.ok) return { ok: false, error: "사이트 링크는 http(s):// 로 시작하는 URL이어야 합니다." };

  const supabase = await createClient();

  // 연결 상태는 폼이 아니라 DB에서 가져옵니다.
  // 저장소를 적었다고 곧바로 "연결됨"은 아니지만, 이미 확인된 연결을 저장 한 번으로
  // 되돌려서도 안 됩니다. **저장소가 실제로 바뀐 경우에만** 초기화합니다.
  const existing = input.originalSlug
    ? (
        await supabase
          .from("projects")
          .select("repo, link_state")
          .eq("slug", input.originalSlug)
          .maybeSingle()
      ).data
    : null;

  const repoChanged = (existing?.repo ?? "") !== repo;
  const linkState: RepoLink = !repo
    ? "unlinked"
    : repoChanged
      ? "unlinked"
      : ((existing?.link_state as RepoLink | undefined) ?? "unlinked");

  const row = {
    slug,
    name,
    description: input.description.trim(),
    repo: repo || null,
    status: input.status,
    link_state: linkState,
    repo_public: input.repoPublic,
    image_url: image.value,
    site_url: site.value,
  };

  const query = input.originalSlug
    ? supabase.from("projects").update(row).eq("slug", input.originalSlug).select("slug").single()
    : supabase.from("projects").insert(row).select("slug").single();

  const { data, error } = await query;

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `주소 "${slug}" 를 이미 다른 프로젝트가 쓰고 있습니다.` };
    }
    return { ok: false, error: error.message };
  }

  refresh();
  return { ok: true, slug: data.slug };
}

export async function deleteProject(slug: string): Promise<{ ok: boolean; error?: string }> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, error: "관리자만 지울 수 있습니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true };
}

/** 프로젝트가 바뀌면 홈·목록·상세·글 상세의 프로젝트 줄이 함께 달라집니다. */
function refresh() {
  revalidatePath("/", "layout");
  revalidatePath("/posts/[slug]", "page");
  revalidatePath("/admin/projects");
}
