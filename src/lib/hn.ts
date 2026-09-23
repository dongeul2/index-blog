import "server-only";

/**
 * Hacker News 인기 글 — 공식 API, 키·인증 없음.
 *
 * 방문자가 보는 공개 화면에서 씁니다. 실시간 위젯이 아니라 **1시간 캐시**입니다 —
 * YouTube 쪽처럼 "매 방문마다 API를 부르면 안 된다"는 규칙과 같은 이유는 아니지만
 * (여기는 쿼터가 없습니다), 이 블로그는 읽기 매체이지 뉴스 리더가 아니므로 초 단위로
 * 최신일 이유가 없습니다.
 *
 * **실패해도 절대 throw하지 않습니다.** 이 섹션 하나 때문에 홈 전체가 죽으면 안 됩니다
 * — 실패하면 빈 배열을 돌려주고, 화면은 섹션을 통째로 생략합니다.
 */

export type HnStory = {
  id: number;
  title: string;
  url: string | null;
  /** url이 없으면(Ask HN 등) 자체 글이라 HN 글 페이지로 보냅니다 */
  href: string;
  score: number;
  commentCount: number;
  /** url의 호스트. 자체 글이면 null */
  domain: string | null;
};

const BASE = "https://hacker-news.firebaseio.com/v0";
const REVALIDATE_SECONDS = 3600;

type RawItem = {
  id: number;
  type?: string;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  dead?: boolean;
  deleted?: boolean;
};

function domainOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function getTopStories(limit = 5): Promise<HnStory[]> {
  try {
    const idsRes = await fetch(`${BASE}/topstories.json`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!idsRes.ok) return [];
    const ids = (await idsRes.json()) as number[];

    // 몇 개는 dead/deleted일 수 있어 필요한 것보다 넉넉히 받아 옵니다.
    const items = await Promise.all(
      ids.slice(0, limit * 2).map(async (id) => {
        const res = await fetch(`${BASE}/item/${id}.json`, {
          next: { revalidate: REVALIDATE_SECONDS },
        });
        if (!res.ok) return null;
        return (await res.json()) as RawItem | null;
      }),
    );

    return items
      .filter(
        (it): it is RawItem =>
          Boolean(it) && it!.type === "story" && !it!.dead && !it!.deleted && Boolean(it!.title),
      )
      .slice(0, limit)
      .map((it) => ({
        id: it.id,
        title: it.title!,
        url: it.url ?? null,
        href: it.url ?? `https://news.ycombinator.com/item?id=${it.id}`,
        score: it.score ?? 0,
        commentCount: it.descendants ?? 0,
        domain: domainOf(it.url),
      }));
  } catch {
    return [];
  }
}
