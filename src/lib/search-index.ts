/**
 * 검색 인덱스.
 *
 * 헤더의 드롭다운은 클라이언트 컴포넌트라 `fs`를 쓰는 `posts.ts`를 import할 수 없습니다.
 * 그래서 서버(루트 레이아웃)에서 이 가벼운 인덱스를 만들어 props로 내려보냅니다.
 * 글이 수천 개가 되면 이 방식 대신 검색 API로 옮겨야 합니다.
 */

export type SearchKind = "post" | "project";

export type SearchItem = {
  kind: SearchKind;
  href: string;
  title: string;
  /** 화면에 함께 보이는 짧은 꼬리표 — 분류나 owner/repo */
  note: string;
  /** 검색 대상 문자열. 미리 소문자로 만들어 둡니다. */
  haystack: string;
};

export const KIND_LABEL: Record<SearchKind, string> = {
  post: "글",
  project: "프로젝트",
};

export function searchIndex(index: SearchItem[], query: string, kind?: SearchKind): SearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index.filter((it) => (!kind || it.kind === kind) && it.haystack.includes(q));
}
