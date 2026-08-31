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
};

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

  // 저장소를 적었다고 곧바로 "연결됨"은 아닙니다.
  // 실제로 GitHub에서 읽어 온 뒤에야 linked로 올립니다(2단계).
  const linkState: RepoLink = "unlinked";

  const row = {
    slug,
    name,
    description: input.description.trim(),
    repo: repo || null,
    status: input.status,
    link_state: linkState,
  };

  const supabase = await createClient();
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
