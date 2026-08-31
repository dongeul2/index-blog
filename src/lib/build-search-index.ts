import { CATEGORY_LABEL, getPosts } from "./posts";
import { getProjects } from "./projects";
import type { SearchItem } from "./search-index";

/**
 * 헤더 드롭다운에 내려보낼 검색 인덱스를 만듭니다(서버 전용).
 * 본문은 넣지 않습니다 — 제목·요약·태그면 이 규모에서는 충분하고, 페이로드가 커지면
 * 모든 화면의 첫 로딩이 함께 무거워집니다.
 */
export async function buildSearchIndex(): Promise<SearchItem[]> {
  const posts: SearchItem[] = (await getPosts()).map((p) => ({
    kind: "post",
    href: `/posts/${p.slug}`,
    title: p.title,
    note: CATEGORY_LABEL[p.category],
    haystack: [p.title, p.summary, ...p.tags].join(" ").toLowerCase(),
  }));

  const projects: SearchItem[] = (await getProjects()).map((p) => ({
    kind: "project",
    href: `/projects/${p.slug}`,
    title: p.name,
    note: p.repo ?? "연결 안 됨",
    haystack: [p.name, p.description, p.repo ?? ""].join(" ").toLowerCase(),
  }));

  return [...posts, ...projects];
}
