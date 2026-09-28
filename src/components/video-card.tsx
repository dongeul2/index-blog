import Link from "next/link";
import { formatDate } from "@/lib/content-types";
import { formatDuration, spokenDuration, type BrowseVideo } from "@/lib/videos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 영상 카드.
 *
 * 카드의 주 링크는 하나 — 13 시청 화면(`/admin/videos/[videoId]`)입니다. 재생과
 * 명령어 입력이 그 화면에서 함께 일어나므로, 카드에서 곧장 유튜브로 내보내지 않습니다.
 * 하단의 보조 링크는 상태에 따라 다른 곳을 가리키고, 링크 중첩을 만들지 않도록
 * 주 링크(`<Link>`) 밖에 따로 섭니다.
 *
 * 이미 글로 정리한 영상은 좌측 2px 괘선으로 표시하고, 색만으로 전하지 않도록
 * `sr-only` 문구를 함께 답니다.
 */
export function VideoCard({ video }: { video: BrowseVideo }) {
  const written = video.writtenSlug !== null;

  return (
    <li
      className={cn(
        "group flex min-w-0 flex-col border border-transparent transition-colors",
        "hover:border-border hover:bg-bg-subtle focus-within:border-border focus-within:bg-bg-subtle",
        written && "border-l-2 border-l-cat-video",
      )}
    >
      <Link
        href={`/admin/videos/${video.videoId}`}
        className="flex flex-col gap-2 p-3 no-underline hover:no-underline"
      >
        {/* 미디어 프레임 — 통제 밖의 이미지 색을 시스템 안으로 가두는 장치 */}
        <span className="relative block aspect-video w-full overflow-hidden border border-border bg-media">
          {video.thumbnail && (
            // 유튜브 썸네일은 next/image의 최적화를 거칠 이유가 없어(외부 CDN이 이미 씁니다)
            // 그대로 씁니다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnail}
              alt={`${video.title} 썸네일`}
              loading="lazy"
              className="size-full object-cover brightness-[0.92] transition-[filter] group-hover:brightness-100 group-focus-within:brightness-100"
            />
          )}
          {video.durationSeconds !== null && (
            <span className="absolute right-1 bottom-1 bg-black/[0.78] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-on-media">
              {formatDuration(video.durationSeconds)}
              <span className="sr-only">, 재생 시간 {spokenDuration(video.durationSeconds)}</span>
            </span>
          )}
        </span>

        <span className="line-clamp-2 text-sm leading-snug font-semibold text-text group-hover:underline group-hover:decoration-accent group-hover:underline-offset-[3px]">
          {video.title}
        </span>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 pb-3">
        <p className="min-w-0 truncate text-caption tabular-nums text-text-muted">
          {video.channelTitle}
          <span aria-hidden="true"> · </span>
          <time dateTime={video.publishedAt}>{formatDate(video.publishedAt.slice(0, 10))}</time>
          {video.hasCaption === false && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="text-warn">자막 없음</span>
            </>
          )}
        </p>

        {written ? (
          <Button asChild variant="ghost" size="xs" className="text-cat-video">
            <Link href={`/admin/posts/${video.writtenSlug}`}>
              정리한 글
              <span className="sr-only">, 이미 글로 정리한 영상입니다</span>
            </Link>
          </Button>
        ) : (
          <Button asChild variant="ghost" size="xs">
            <a
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              YouTube에서 보기 <span aria-hidden="true">↗</span>
            </a>
          </Button>
        )}
      </div>
    </li>
  );
}
