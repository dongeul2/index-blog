import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasApiKey as hasYoutubeKey, videoInfo } from "@/lib/youtube";
import { hasApiKey as hasGeminiKey } from "@/lib/ai/provider";
import { VideoWatchPanel } from "./video-watch-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "영상 시청",
  robots: { index: false, follow: false },
};

/** 영상 정보(1유닛)·자막 가용성 힌트는 매번 최신이어야 합니다 — 캐시하지 않습니다. */
export const dynamic = "force-dynamic";

type Params = { videoId: string };

export default async function WatchPage({ params }: { params: Promise<Params> }) {
  const { videoId } = await params;

  if (!hasYoutubeKey()) {
    return (
      <div className="page admin-page">
        <p className="editor__crumb">
          <Link href="/admin/videos">← 영상 브라우즈</Link>
        </p>
        <Alert variant="warn" className="mt-6 max-w-(--container-prose)">
          <AlertTitle>키가 없습니다</AlertTitle>
          <AlertDescription>
            <code className="font-mono">YOUTUBE_API_KEY</code> 가 없어 영상 정보를 불러올 수
            없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const info = await videoInfo(videoId);

  if (!info.ok) {
    return (
      <div className="page admin-page">
        <p className="editor__crumb">
          <Link href="/admin/videos">← 영상 브라우즈</Link>
        </p>
        <Alert
          variant={info.kind === "daily" ? "warn" : "danger"}
          className="mt-6 max-w-(--container-prose)"
        >
          <AlertTitle>{info.kind === "daily" ? "일일 쿼터 소진" : "영상을 불러오지 못했습니다"}</AlertTitle>
          <AlertDescription>{info.message}</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (!info.data) notFound();

  const video = info.data;

  const supabase = await createClient();
  // 같은 영상으로 여러 번 만들었을 수 있어 가장 최근 것만 봅니다.
  const { data: written } = await supabase
    .from("posts")
    .select("slug")
    .eq("source_ref", videoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="page admin-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="editor__crumb">
          <Link href="/admin/videos">← 영상 브라우즈</Link>
        </p>
        <Button asChild variant="ghost" size="xs">
          <a
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            YouTube에서 보기 <span aria-hidden="true">↗</span>
          </a>
        </Button>
      </div>

      <VideoWatchPanel
        video={{
          videoId: video.videoId,
          title: video.title,
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          publishedAt: video.publishedAt,
          description: video.description,
          durationSeconds: video.durationSeconds,
          hasCaption: video.hasCaption,
          viewCount: video.viewCount,
        }}
        geminiEnabled={hasGeminiKey()}
        writtenSlug={written?.slug ?? null}
      />
    </div>
  );
}
