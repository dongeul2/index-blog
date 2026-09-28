import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getQuota } from "@/lib/ai/quota";
import { browseUploads } from "@/lib/videos";
import { hasApiKey } from "@/lib/youtube";
import type { Channel } from "@/lib/project-types";
import { VideoCard } from "@/components/video-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Chip, ChipCount } from "@/components/ui/chip";

export const metadata: Metadata = {
  title: "영상 브라우즈",
  robots: { index: false, follow: false },
};

/** 훑을 때마다 쿼터를 쓰고 결과도 매번 달라집니다 — 캐시하지 않습니다. */
export const dynamic = "force-dynamic";

type Search = { channel?: string };

export default async function VideosPage({ searchParams }: { searchParams: Promise<Search> }) {
  const supabase = await createClient();

  const [{ data: rows }, sp, quota] = await Promise.all([
    supabase.from("channels").select("id, name, handle, url, note").order("name"),
    searchParams,
    getQuota(),
  ]);

  const channels = (rows ?? []) as Channel[];
  const selected = channels.find((c) => c.id === sp.channel)?.id ?? null;
  const targets = selected ? [selected] : channels.map((c) => c.id);

  // 쿼터가 없으면 아예 부르지 않습니다. 불러 봐야 403만 받고 유닛은 그대로 나갑니다.
  const quotaEmpty = quota.youtube.unitsRemaining <= 0;
  const canBrowse = hasApiKey() && !quotaEmpty && targets.length > 0;

  const browse = canBrowse
    ? await browseUploads(targets)
    : { videos: [], unitsSpent: 0, failures: [] };

  const writtenCount = browse.videos.filter((v) => v.writtenSlug).length;

  return (
    <div className="page admin-page">
      <header className="admin-head">
        <div className="admin-head__row">
          <div>
            <h1 className="admin-head__title">영상 브라우즈</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/videos/channels">채널 구독 관리</Link>
          </Button>
        </div>

        <p className="admin-head__who">
          구독 {channels.length}개 채널의 최신 업로드
          {browse.videos.length > 0 && (
            <>
              <span aria-hidden="true"> · </span>
              {browse.videos.length}편 중 {writtenCount}편은 이미 글로 정리함
            </>
          )}
        </p>

        {/* 이 화면이 얼마를 썼는지 숨기지 않습니다 */}
        <p className="mt-2 text-[0.8125rem] font-semibold text-text-2 tabular-nums">
          <output aria-live="polite">
            이번 훑기 {browse.unitsSpent}유닛 · 남은 유닛{" "}
            <span
              className={
                quota.youtube.level === "empty"
                  ? "text-danger"
                  : quota.youtube.level === "warn"
                    ? "text-warn"
                    : "text-text-2"
              }
            >
              {quota.youtube.unitsRemaining.toLocaleString()}
            </span>
            {" / "}
            {quota.youtube.unitsLimit.toLocaleString()}
          </output>
        </p>
      </header>

      {/* ---------- 채널 필터 — 전부 링크라 URL이 곧 화면입니다 ---------- */}
      {channels.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-1.5">
          <Chip asChild variant={selected ? "default" : "active"}>
            <Link href="/admin/videos" aria-current={selected ? undefined : "page"}>
              전체
              <ChipCount>{channels.length}</ChipCount>
            </Link>
          </Chip>
          {channels.map((c) => (
            <Chip key={c.id} asChild variant={selected === c.id ? "active" : "default"}>
              <Link
                href={`/admin/videos?channel=${encodeURIComponent(c.id)}`}
                aria-current={selected === c.id ? "page" : undefined}
              >
                {c.name}
              </Link>
            </Chip>
          ))}
        </div>
      )}

      {/* ---------- 못 부른 이유 ---------- */}
      {!hasApiKey() && (
        <Alert variant="warn" className="mt-8 max-w-(--container-prose)">
          <AlertTitle>키가 없습니다</AlertTitle>
          <AlertDescription>
            <code className="font-mono">YOUTUBE_API_KEY</code> 를 <code className="font-mono">.env.local</code> 에
            넣으면 구독 채널의 업로드를 훑습니다.
          </AlertDescription>
        </Alert>
      )}

      {hasApiKey() && quotaEmpty && (
        <Alert variant="warn" className="mt-8 max-w-(--container-prose)">
          <AlertTitle>일일 쿼터 소진</AlertTitle>
          <AlertDescription>
            오늘 쓸 수 있는 YouTube 유닛을 다 썼습니다. PT 자정에 리셋됩니다 — 그때까지는
            훑기도 검색도 되지 않습니다.
          </AlertDescription>
        </Alert>
      )}

      {browse.failures.length > 0 && (
        <Alert variant="warn" className="mt-8 max-w-(--container-prose)">
          <AlertTitle>일부 채널을 읽지 못했습니다</AlertTitle>
          <AlertDescription>
            <ul>
              {browse.failures.map((f, i) => (
                <li key={`${f.channelId}-${i}`}>
                  {channels.find((c) => c.id === f.channelId)?.name ??
                    (f.channelId || "영상 상세")}{" "}
                  — {f.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* ---------- 훑기 피드 ---------- */}
      {browse.videos.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 [scroll-snap-type:y_proximity] md:grid-cols-2 lg:grid-cols-3">
          {browse.videos.map((v) => (
            <VideoCard key={v.videoId} video={v} />
          ))}
        </ul>
      ) : (
        canBrowse && (
          <div className="empty-state admin-empty">
            <p>최신 업로드가 없습니다.</p>
          </div>
        )
      )}

      {channels.length === 0 && (
        <div className="empty-state admin-empty">
          <p>아직 구독한 채널이 없습니다.</p>
          <p className="admin-empty__action">
            <Button asChild>
              <Link href="/admin/videos/channels">첫 채널 등록하기</Link>
            </Button>
          </p>
        </div>
      )}
    </div>
  );
}
