import "server-only";
import { logUsage } from "@/lib/ai/usage";
import type { ErrorKind } from "@/lib/ai/errors";

/**
 * YouTube Data API — 최소 클라이언트.
 *
 * 남은 쿼터를 물어볼 엔드포인트가 없으므로, 호출한 메서드에 따라 **고정 유닛**을
 * 여기서 직접 기록합니다. 기록은 이 파일 안에서 자동으로 일어납니다 —
 * 부르는 쪽에 로깅을 맡기면 한 곳만 빠뜨려도 집계가 조용히 틀어집니다.
 *
 * 무엇을 부르느냐가 하루치를 결정합니다. `search.list` 한 번이
 * `playlistItems.list` 백 번과 같습니다.
 */

/** 메서드별 고정 유닛. 호출 전에 정해져 있습니다. */
export const UNITS = {
  "search.list": 100,
  "playlistItems.list": 1,
  "videos.list": 1,
  "channels.list": 1,
} as const;

export type YouTubeOperation = keyof typeof UNITS;

const BASE = "https://www.googleapis.com/youtube/v3";

export function hasApiKey(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

/**
 * 채널의 업로드 재생목록 ID.
 *
 * `UC...` 채널 ID의 업로드 재생목록은 `UU...` 입니다 — 앞 두 글자만 바뀝니다.
 * `channels.list`를 불러서 알아낼 필요가 없어 1유닛을 아낍니다.
 */
export function uploadsPlaylistId(channelId: string): string {
  return channelId.startsWith("UC") ? `UU${channelId.slice(2)}` : channelId;
}

/** YouTube의 쿼터 소진은 429가 아니라 403 + reason=quotaExceeded 로 옵니다. */
function classifyYouTube(status: number, body: string): ErrorKind {
  if (status === 403 && /quotaExceeded|dailyLimitExceeded/i.test(body)) return "daily";
  if (status === 429 || /rateLimitExceeded|userRateLimitExceeded/i.test(body)) return "rate";
  if (status === 401 || status === 403) return "auth";
  return "other";
}

export type YouTubeResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: ErrorKind; message: string };

/**
 * 한 번 부르고 그만큼 기록합니다.
 *
 * **실패해도 유닛은 그대로 기록합니다** — YouTube는 호출이 실패해도 쿼터를 차감합니다.
 * 실패한 호출을 0으로 남기면 화면의 잔여가 실제보다 넉넉해 보이고,
 * 그러면 "아직 남았는데 왜 안 되지"가 됩니다.
 */
async function call<T>(
  operation: YouTubeOperation,
  params: Record<string, string>,
): Promise<YouTubeResult<T>> {
  const units = UNITS[operation];

  if (!hasApiKey()) {
    return { ok: false, kind: "auth", message: "YOUTUBE_API_KEY 가 .env.local 에 없습니다." };
  }

  const path = operation.replace(".list", "");
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);

  try {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const body = await res.text();
      const kind = classifyYouTube(res.status, body);
      await logUsage({
        provider: "youtube",
        operation,
        quotaUnits: units,
        success: false,
        errorKind: kind,
      });
      return {
        ok: false,
        kind,
        message:
          kind === "daily"
            ? "YouTube 일일 쿼터를 다 썼습니다. PT 자정에 리셋됩니다."
            : `YouTube API 오류 (${res.status})`,
      };
    }

    await logUsage({ provider: "youtube", operation, quotaUnits: units, success: true });
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    // 네트워크 단계에서 끊긴 것이라 쿼터가 나갔는지 알 수 없습니다.
    // 넉넉히 잡는 쪽(기록함)이 안전합니다 — 잔여를 실제보다 많게 보이는 것보다 낫습니다.
    await logUsage({
      provider: "youtube",
      operation,
      quotaUnits: units,
      success: false,
      errorKind: "other",
    });
    return { ok: false, kind: "other", message: e instanceof Error ? e.message : String(e) };
  }
}

/* ============================================================
   메서드
   ============================================================ */

export type VideoBrief = {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string | null;
};

type PlaylistItemsResponse = {
  items: {
    snippet: {
      title: string;
      channelId: string;
      videoOwnerChannelId?: string;
      videoOwnerChannelTitle?: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails?: Record<string, { url: string }>;
      resourceId: { videoId: string };
    };
  }[];
  nextPageToken?: string;
};

/**
 * 채널의 최신 업로드. **1유닛.**
 *
 * 구독 채널을 훑는 기본 경로입니다. 같은 일을 `search.list`로 하면 100배가 듭니다.
 */
export async function listUploads(
  channelId: string,
  opts: { max?: number; pageToken?: string } = {},
): Promise<YouTubeResult<{ videos: VideoBrief[]; nextPageToken?: string }>> {
  const params: Record<string, string> = {
    part: "snippet",
    playlistId: uploadsPlaylistId(channelId),
    maxResults: String(Math.min(opts.max ?? 25, 50)),
  };
  if (opts.pageToken) params.pageToken = opts.pageToken;

  const res = await call<PlaylistItemsResponse>("playlistItems.list", params);
  if (!res.ok) return res;

  return {
    ok: true,
    data: {
      videos: res.data.items.map((it) => ({
        videoId: it.snippet.resourceId.videoId,
        title: it.snippet.title,
        channelId: it.snippet.videoOwnerChannelId ?? it.snippet.channelId,
        channelTitle: it.snippet.videoOwnerChannelTitle ?? it.snippet.channelTitle,
        publishedAt: it.snippet.publishedAt,
        thumbnail:
          it.snippet.thumbnails?.medium?.url ?? it.snippet.thumbnails?.default?.url ?? null,
      })),
      nextPageToken: res.data.nextPageToken,
    },
  };
}

type VideosResponse = {
  items: {
    id: string;
    contentDetails: { duration: string; caption: string };
    statistics?: { viewCount?: string };
  }[];
};

export type VideoDetail = {
  videoId: string;
  /** ISO 8601 기간(PT12M34S). 초로 바꾸려면 parseDuration(). */
  duration: string;
  durationSeconds: number;
  /** 자막이 있는가. 없으면 요약을 권하지 않습니다. */
  hasCaption: boolean;
  viewCount: number | null;
};

/** ISO 8601 기간을 초로. `PT1H2M3S` → 3723 */
export function parseDuration(iso: string): number {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return +(d ?? 0) * 86400 + +(h ?? 0) * 3600 + +(min ?? 0) * 60 + +(s ?? 0);
}

/**
 * 영상 상세. **1유닛** — ID를 최대 50개까지 한 번에 묶습니다.
 *
 * 50개를 한 번에 보내면 1유닛, 하나씩 50번 보내면 50유닛입니다.
 */
export async function videoDetails(videoIds: string[]): Promise<YouTubeResult<VideoDetail[]>> {
  if (!videoIds.length) return { ok: true, data: [] };

  const res = await call<VideosResponse>("videos.list", {
    part: "contentDetails,statistics",
    id: videoIds.slice(0, 50).join(","),
  });
  if (!res.ok) return res;

  return {
    ok: true,
    data: res.data.items.map((it) => ({
      videoId: it.id,
      duration: it.contentDetails.duration,
      durationSeconds: parseDuration(it.contentDetails.duration),
      hasCaption: it.contentDetails.caption === "true",
      viewCount: it.statistics?.viewCount ? Number(it.statistics.viewCount) : null,
    })),
  };
}

type SearchResponse = {
  items: {
    id: { videoId?: string };
    snippet: {
      title: string;
      channelId: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails?: Record<string, { url: string }>;
    };
  }[];
};

/**
 * 채널 안에서 검색. **100유닛 — 하루 100번이면 끝입니다.**
 *
 * 캐시된 영상에서 먼저 찾고, 거기 없을 때만 명시적으로 부르세요.
 * 부르는 화면은 이 비용을 사람에게 보여 줘야 합니다.
 */
export async function searchInChannel(
  channelId: string,
  query: string,
  max = 25,
): Promise<YouTubeResult<VideoBrief[]>> {
  const res = await call<SearchResponse>("search.list", {
    part: "snippet",
    type: "video",
    channelId,
    q: query,
    maxResults: String(Math.min(max, 50)),
    order: "relevance",
  });
  if (!res.ok) return res;

  return {
    ok: true,
    data: res.data.items
      .filter((it) => it.id.videoId)
      .map((it) => ({
        videoId: it.id.videoId!,
        title: it.snippet.title,
        channelId: it.snippet.channelId,
        channelTitle: it.snippet.channelTitle,
        publishedAt: it.snippet.publishedAt,
        thumbnail:
          it.snippet.thumbnails?.medium?.url ?? it.snippet.thumbnails?.default?.url ?? null,
      })),
  };
}

type ChannelsResponse = {
  items: {
    id: string;
    snippet: { title: string; customUrl?: string; thumbnails?: Record<string, { url: string }> };
  }[];
};

export type ChannelInfo = {
  id: string;
  title: string;
  handle: string | null;
  thumbnail: string | null;
};

/** 채널 정보. **1유닛.** 구독을 등록할 때 한 번만 부르면 됩니다. */
export async function channelInfo(channelId: string): Promise<YouTubeResult<ChannelInfo | null>> {
  const res = await call<ChannelsResponse>("channels.list", { part: "snippet", id: channelId });
  if (!res.ok) return res;

  const it = res.data.items[0];
  if (!it) return { ok: true, data: null };

  return {
    ok: true,
    data: {
      id: it.id,
      title: it.snippet.title,
      handle: it.snippet.customUrl ?? null,
      thumbnail: it.snippet.thumbnails?.default?.url ?? null,
    },
  };
}
