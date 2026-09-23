import "server-only";
import { createClient } from "@/lib/supabase/server";
import { listUploads, videoDetails, type VideoBrief } from "@/lib/youtube";
import type { ErrorKind } from "@/lib/ai/errors";

/** 순수 포맷 함수는 클라이언트 컴포넌트도 써야 해서 server-only가 없는 곳에 있습니다. */
export { formatDuration, spokenDuration } from "./duration";

/**
 * 12 영상 브라우즈가 쓰는 조립.
 *
 * 훑기는 `playlistItems.list`(1유닛)만 씁니다 — 같은 일을 `search.list`로 하면 100배입니다.
 * 상세(길이·자막)는 ID를 50개씩 묶어 한 번에 물으므로, 화면 한 번에 드는 값은
 * **채널 수 + 1유닛**입니다. 이 숫자를 화면이 사람에게 그대로 보여 줍니다.
 */

export type BrowseVideo = VideoBrief & {
  durationSeconds: number | null;
  hasCaption: boolean | null;
  /** 이미 이 영상으로 쓴 글의 slug. 없으면 null */
  writtenSlug: string | null;
};

export type BrowseResult = {
  videos: BrowseVideo[];
  /** 이번에 실제로 쓴 유닛 */
  unitsSpent: number;
  /** 채널별로 실패한 것. 하나가 실패해도 나머지는 보여 줍니다. */
  failures: { channelId: string; kind: ErrorKind; message: string }[];
};

/**
 * 구독 채널의 최신 업로드를 모아 한 줄로 세웁니다.
 *
 * 한 채널이 실패해도 나머지는 그대로 보여 줍니다 — 채널 하나가 지워졌다고
 * 화면 전체가 비면 무엇이 잘못됐는지 알 수 없습니다.
 */
export async function browseUploads(
  channelIds: string[],
  { perChannel = 12, limit = 24 }: { perChannel?: number; limit?: number } = {},
): Promise<BrowseResult> {
  if (channelIds.length === 0) return { videos: [], unitsSpent: 0, failures: [] };

  const results = await Promise.all(
    channelIds.map(async (id) => ({ id, res: await listUploads(id, { max: perChannel }) })),
  );

  const failures: BrowseResult["failures"] = [];
  const briefs: VideoBrief[] = [];

  for (const { id, res } of results) {
    if (res.ok) briefs.push(...res.data.videos);
    else failures.push({ channelId: id, kind: res.kind, message: res.message });
  }

  briefs.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const top = briefs.slice(0, limit);
  let unitsSpent = channelIds.length;

  // 길이·자막은 50개를 한 번에 물어 1유닛입니다.
  const details = new Map<string, { durationSeconds: number; hasCaption: boolean }>();
  if (top.length > 0) {
    const res = await videoDetails(top.map((v) => v.videoId));
    unitsSpent += 1;
    if (res.ok) {
      for (const d of res.data) {
        details.set(d.videoId, { durationSeconds: d.durationSeconds, hasCaption: d.hasCaption });
      }
    } else {
      failures.push({ channelId: "", kind: res.kind, message: res.message });
    }
  }

  // 이미 글로 만든 영상. `source_ref`가 videoId입니다.
  const written = new Map<string, string>();
  if (top.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select("slug, source_ref")
      .in("source_ref", top.map((v) => v.videoId));

    for (const row of data ?? []) {
      if (row.source_ref) written.set(row.source_ref as string, row.slug as string);
    }
  }

  return {
    videos: top.map((v) => ({
      ...v,
      durationSeconds: details.get(v.videoId)?.durationSeconds ?? null,
      hasCaption: details.get(v.videoId)?.hasCaption ?? null,
      writtenSlug: written.get(v.videoId) ?? null,
    })),
    unitsSpent,
    failures,
  };
}
