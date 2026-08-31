import { cache } from "react";
import type { Root } from "mdast";

import {
  CATEGORIES,
  isCategory,
  yearOf,
  type Category,
  type Facet,
  type Filters,
  type PostMeta,
  type Source,
} from "./content-types";
import { parseMarkdown, prepare, readingMinutes } from "./markdown";
import { supabasePublic } from "./supabase/public";

export * from "./content-types";

/**
 * 게시물 읽기.
 *
 * 저장소는 Supabase의 `public.posts` 테이블이고, 공개 화면에 무엇이 보이는지는
 * 애플리케이션이 아니라 **RLS가** 결정합니다(발행됨 + 발행 시각이 지난 글만).
 * 그래서 아래 질의에는 `status` 조건이 없습니다 — 조건을 앱에 두면 한 곳만 빠뜨려도
 * 초안이 새어 나갑니다.
 *
 * 목록·필터·집계는 한 번 받아 온 뒤 메모리에서 처리합니다. 글이 수천 편이 되면
 * 축별 질의로 나눠야 하지만, 그 전까지는 왕복을 줄이는 쪽이 빠르고 단순합니다.
 */

const COLUMNS =
  "slug, title, category, summary, tags, source, source_ref, project, channel, is_generated, published_at, body";

type Row = {
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  tags: string[] | null;
  source: string;
  source_ref: string | null;
  project: string | null;
  channel: string | null;
  is_generated: boolean;
  published_at: string;
  body: string | null;
};

/**
 * 발행 시각을 서울 날짜로 옮깁니다.
 *
 * KST 자정에 저장된 글을 UTC 기준으로 자르면 하루 전날이 됩니다.
 * 표시용 날짜는 언제나 이 함수를 거쳐야 합니다.
 */
function seoulDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/**
 * 한 행을 메타데이터 + 본문 트리로 풉니다.
 *
 * 읽는 시간과 소제목은 본문에서 계산합니다. 목록에서도 본문을 함께 받아 오는 이유가
 * 이것입니다 — 목록과 상세가 다른 방식으로 세면 같은 글에 다른 숫자가 붙습니다.
 * 글이 많아지면 저장 시점에 계산해 컬럼으로 두는 쪽으로 옮겨야 합니다.
 */
function toPost(row: Row): { meta: PostMeta; tree: Root } {
  const tree = parseMarkdown(row.body ?? "");
  const headings = prepare(tree);

  return {
    tree,
    meta: {
      slug: row.slug,
      title: row.title,
      category: isCategory(row.category) ? row.category : "essay",
      date: seoulDate(row.published_at),
      readingMinutes: readingMinutes(tree),
      summary: row.summary ?? "",
      tags: row.tags ?? [],
      source: row.source as Source,
      sourceRef: row.source_ref ?? undefined,
      generated: row.is_generated,
      project: row.project ?? undefined,
      channel: row.channel ?? undefined,
      headings,
    },
  };
}

/** 요청 한 번에 한 번만 받아 옵니다. */
const loadAll = cache(async (): Promise<{ meta: PostMeta; tree: Root }[]> => {
  const { data, error } = await supabasePublic
    .from("posts")
    .select(COLUMNS)
    .order("published_at", { ascending: false });

  if (error) throw new Error(`글 목록을 불러오지 못했습니다: ${error.message}`);
  return (data as Row[]).map(toPost);
});

/** 최신순 */
export async function getPosts(): Promise<PostMeta[]> {
  return (await loadAll()).map((p) => p.meta);
}

export async function getPost(slug: string): Promise<PostMeta | undefined> {
  return (await loadAll()).find((p) => p.meta.slug === slug)?.meta;
}

/** 본문 트리 — 글 상세에서만 씁니다. */
export async function getPostTree(slug: string): Promise<Root | undefined> {
  return (await loadAll()).find((p) => p.meta.slug === slug)?.tree;
}

/** 아카이브(최신순) 기준 이전 글 / 다음 글 */
export async function getAdjacent(slug: string): Promise<{ prev?: PostMeta; next?: PostMeta }> {
  const posts = await getPosts();
  const i = posts.findIndex((p) => p.slug === slug);
  if (i < 0) return {};
  return { prev: posts[i + 1], next: posts[i - 1] };
}

export async function categoryHighlights(perCategory = 3) {
  const posts = await getPosts();
  return CATEGORIES.map((c) => {
    const items = posts.filter((p) => p.category === c);
    return { category: c, total: items.length, posts: items.slice(0, perCategory) };
  });
}

/** 개수 내림차순, 같으면 가나다순 */
function countBy(values: string[]): Facet[] {
  const count = new Map<string, number>();
  for (const v of values) count.set(v, (count.get(v) ?? 0) + 1);
  return [...count.entries()]
    .map(([value, n]) => ({ value, count: n }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "ko"));
}

/* ============================================================
   02 아카이브 — 필터
   ============================================================ */

export async function filterPosts({ category, tag, year }: Filters): Promise<PostMeta[]> {
  const posts = await getPosts();
  return posts.filter(
    (p) =>
      (!category || p.category === category) &&
      (!tag || p.tags.includes(tag)) &&
      (!year || yearOf(p.date) === year),
  );
}

/**
 * 각 축의 선택지와 개수.
 *
 * 개수는 **자기 축을 뺀 나머지 필터**를 적용한 결과에서 셉니다. 그래야 분류를 고른 뒤에도
 * 태그 목록이 "지금 고르면 몇 개가 남는지"를 정직하게 보여줍니다.
 */
export async function facets(filters: Filters) {
  const [forCategories, forTags, forYears] = await Promise.all([
    filterPosts({ tag: filters.tag, year: filters.year }),
    filterPosts({ category: filters.category, year: filters.year }),
    filterPosts({ category: filters.category, tag: filters.tag }),
  ]);

  const categories: Facet<Category>[] = CATEGORIES.map((c) => ({
    value: c,
    count: forCategories.filter((p) => p.category === c).length,
  }));

  return {
    categories,
    tags: countBy(forTags.flatMap((p) => p.tags)),
    years: countBy(forYears.map((p) => yearOf(p.date))).sort((a, b) =>
      a.value < b.value ? 1 : -1,
    ),
  };
}

/* ============================================================
   05 태그
   ============================================================ */

export async function tagCounts(): Promise<Facet[]> {
  return countBy((await getPosts()).flatMap((p) => p.tags));
}

export async function postsOfTag(tag: string): Promise<PostMeta[]> {
  return (await getPosts()).filter((p) => p.tags.includes(tag));
}

/** 이 태그와 같은 글에 함께 달린 태그들 */
export async function relatedTags(tag: string): Promise<Facet[]> {
  const posts = await postsOfTag(tag);
  return countBy(posts.flatMap((p) => p.tags.filter((t) => t !== tag)));
}

/* ============================================================
   프로젝트 · 채널 연결
   ============================================================ */

export async function postsOfProject(slug: string): Promise<PostMeta[]> {
  return (await getPosts()).filter((p) => p.project === slug);
}

export async function postsOfChannel(id: string): Promise<PostMeta[]> {
  return (await getPosts()).filter((p) => p.channel === id);
}

/* ============================================================
   04 검색
   ============================================================ */

export async function searchPosts(query: string): Promise<PostMeta[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return (await getPosts()).filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)),
  );
}
