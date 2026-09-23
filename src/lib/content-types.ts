/**
 * 콘텐츠 타입과 순수 헬퍼.
 *
 * 이 파일에는 파일 시스템 접근이 없습니다 — 클라이언트 컴포넌트에서도 안전하게 import할 수
 * 있어야 하기 때문입니다. 실제 마크다운을 읽는 쪽은 `posts.ts`(서버 전용)입니다.
 * 필드 이름은 기획서의 프론트매터 키와 맞춰 두었습니다.
 */

export type Category = "devlog" | "video" | "essay";

export const CATEGORY_LABEL: Record<Category, string> = {
  devlog: "개발일지",
  video: "영상요약",
  essay: "일반글",
};

export const CATEGORIES: Category[] = ["devlog", "video", "essay"];

/** 프론트매터 `source` — 이 글이 어디서 왔는지 */
export type Source = "manual" | "youtube-summary" | "slack-claude-code";

export type Heading = { id: string; text: string; level: 2 | 3 };

export type PostMeta = {
  slug: string;
  title: string;
  category: Category;
  /** ISO 날짜. `<time datetime>`에 그대로 들어갑니다. */
  date: string;
  /** 본문 길이에서 계산합니다 — 프론트매터에 두면 본문과 어긋납니다. */
  readingMinutes: number;
  summary: string;
  tags: string[];
  source: Source;
  /** 유튜브 영상 ID, PR 번호 등 */
  sourceRef?: string;
  /** `source !== "manual"` — 캡션에 "자동 생성"으로 표기됩니다. */
  generated: boolean;
  /** devlog는 소속 프로젝트 링크 줄을 글 상단에 답니다. */
  project?: string;
  /** video 요약 글이 어느 구독 채널에서 나왔는지 */
  channel?: string;
  /** 본문에서 뽑은 h2·h3 */
  headings: Heading[];
};

export type Facet<T extends string = string> = { value: T; count: number };

export type Filters = {
  category?: Category;
  tag?: string;
  year?: string;
};

export const PER_PAGE = 6;

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

export const yearOf = (iso: string) => iso.slice(0, 4);

export function isCategory(v: string | undefined): v is Category {
  return v === "devlog" || v === "video" || v === "essay";
}

export function isSource(v: string | undefined): v is Source {
  return v === "manual" || v === "youtube-summary" || v === "slack-claude-code";
}

/** 필터 상태를 쿼리 문자열로. 값이 없는 축은 아예 빼서 URL을 짧게 유지합니다. */
export function archiveHref(filters: Filters & { page?: number }): string {
  const q = new URLSearchParams();
  if (filters.category) q.set("category", filters.category);
  if (filters.tag) q.set("tag", filters.tag);
  if (filters.year) q.set("year", filters.year);
  if (filters.page && filters.page > 1) q.set("page", String(filters.page));
  const s = q.toString();
  return s ? `/archive?${s}` : "/archive";
}

export function paginate<T>(items: T[], page: number, perPage = PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * perPage;
  return { items: items.slice(start, start + perPage), current, totalPages, total: items.length };
}
