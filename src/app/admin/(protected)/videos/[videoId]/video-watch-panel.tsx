"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { parseMarkdown, prepare } from "@/lib/markdown";
import { formatDate } from "@/lib/content-types";
import { formatDuration, spokenDuration } from "@/lib/duration";
import {
  ERROR_MARK,
  USAGE_MARK,
  isTokenLimitMessage,
  parseDraft,
  type StreamUsage,
} from "@/lib/ai/shared";
import { saveVideoDraft } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

/** 서버(page.tsx)가 넘겨주는 값 — youtube.ts를 직접 import하지 않습니다.
 *  그 파일은 server-only라 클라이언트 번들에 들어가면 안 됩니다. */
export type WatchVideo = {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  durationSeconds: number;
  hasCaption: boolean;
  viewCount: number | null;
};

const PRESETS = ["핵심 3줄", "실무 적용 아이디어", "코드 예제 위주로"] as const;

/** 원인별 4종. kind는 스트림이 주는 값이거나, 서버가 자막을 못 받았을 때 주는 "no_caption"입니다. */
type PanelError = { kind: "no_caption" | "rate" | "daily" | "auth" | "token" | "other"; message: string };

const ERROR_TITLE: Record<PanelError["kind"], string> = {
  no_caption: "자막 없음",
  daily: "일일 한도 소진",
  token: "토큰 초과",
  rate: "잠시 후 다시 시도",
  auth: "인증 오류",
  other: "실패",
};

export function VideoWatchPanel({
  video,
  geminiEnabled,
  writtenSlug,
}: {
  video: WatchVideo;
  geminiEnabled: boolean;
  writtenSlug: string | null;
}) {
  const router = useRouter();

  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [usage, setUsage] = useState<StreamUsage | null>(null);
  const [error, setError] = useState<PanelError | null>(null);
  /** 실제로 무엇을 근거로 썼는지 — 응답 헤더에서 읽습니다(모델 출력에 기대지 않습니다) */
  const [source, setSource] = useState<"transcript" | "description" | null>(null);
  const [saving, setSaving] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  /** 모바일 하단 시트 — 데스크톱에서는 CSS가 이 값과 무관하게 항상 펼칩니다 */
  const [sheetOpen, setSheetOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function generate() {
    setStreaming(true);
    setDraft("");
    setUsage(null);
    setError(null);
    setSource(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/summarize-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.videoId,
          title: video.title,
          channelTitle: video.channelTitle,
          description: video.description,
          instruction,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const body = await response
          .json()
          .catch(() => ({ error: "요청이 실패했습니다.", kind: "other" }));
        setError({
          kind: body.kind === "no_caption" ? "no_caption" : "other",
          message: body.error ?? "요청이 실패했습니다.",
        });
        setStreaming(false);
        return;
      }

      const src = response.headers.get("X-Summary-Source");
      setSource(src === "transcript" || src === "description" ? src : null);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setDraft(text);
      }

      // 스트림은 헤더가 이미 나간 뒤라 실패를 상태코드로 알릴 수 없어, 본문 끝에 실려 옵니다.
      const usageAt = text.indexOf(USAGE_MARK);
      const errorAt = text.indexOf(ERROR_MARK);
      if (errorAt >= 0) {
        const raw = text.slice(errorAt + ERROR_MARK.length).trim();
        const parsed = JSON.parse(raw) as { kind: string; message: string };
        // "other"인데 메시지가 토큰 초과를 가리키면 그 문구로 더 좁혀 보여 줍니다.
        const kind: PanelError["kind"] =
          parsed.kind === "other" && isTokenLimitMessage(parsed.message)
            ? "token"
            : (parsed.kind as PanelError["kind"]);
        setError({ kind, message: parsed.message });
        setDraft(text.slice(0, errorAt));
      } else if (usageAt >= 0) {
        setUsage(JSON.parse(text.slice(usageAt + USAGE_MARK.length)) as StreamUsage);
        setDraft(text.slice(0, usageAt));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError({ kind: "other", message: (e as Error).message });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  const parsed = parseDraft(draft);
  const previewTree = useMemo(() => {
    if (!parsed.body.trim()) return null;
    const tree = parseMarkdown(parsed.body);
    prepare(tree);
    return tree;
  }, [parsed.body]);

  async function keep() {
    setSaving(true);
    const result = await saveVideoDraft({
      videoId: video.videoId,
      channelId: video.channelId,
      title: parsed.title,
      summary: parsed.summary,
      body: parsed.body,
    });
    setSaving(false);
    if (result.ok) router.push(`/admin/posts/${result.slug}`);
    else setError({ kind: "other", message: result.error });
  }

  return (
    <div className="editor">
      {/* ---------- 영상 + 명령 패널: 데스크톱 2열, 모바일 1열 + 하단 시트 ---------- */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* ---------- 좌: 영상 ---------- */}
        <div className="min-w-0 pb-20 lg:pb-0">
          <div className="relative aspect-video w-full overflow-hidden border border-border bg-media">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.videoId}`}
              title={video.title}
              className="size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <h1 className="mt-4 text-h4 leading-snug font-semibold text-text">{video.title}</h1>
          <p className="mt-1.5 font-mono text-[0.75rem] text-text-muted">
            {video.channelTitle}
            <span aria-hidden="true"> · </span>
            <time dateTime={video.publishedAt}>{formatDate(video.publishedAt.slice(0, 10))}</time>
            <span aria-hidden="true"> · </span>
            <span>
              {formatDuration(video.durationSeconds)}
              <span className="sr-only">, 재생 시간 {spokenDuration(video.durationSeconds)}</span>
            </span>
            {video.viewCount !== null && (
              <>
                <span aria-hidden="true"> · </span>
                조회 {video.viewCount.toLocaleString()}
              </>
            )}
          </p>

          {writtenSlug && (
            <Alert variant="info" className="mt-4">
              <AlertTitle>이미 정리한 영상입니다</AlertTitle>
              <AlertDescription>
                <Link href={`/admin/posts/${writtenSlug}`}>기존 글 보기 →</Link> — 다시 만들면
                별도의 새 초안으로 저장됩니다.
              </AlertDescription>
            </Alert>
          )}

          {/* YouTube 자체 판정. 우리 자막 수신은 실제로 시도해야 압니다 — 이건 미리 보이는 힌트일 뿐입니다 */}
          {!video.hasCaption && (
            <Alert variant="note" className="mt-4">
              <AlertTitle>자막 없음</AlertTitle>
              <AlertDescription>
                이 영상에는 자막이 없는 것으로 보입니다. 초안은 만들 수 있지만 설명文만
                근거로 삼아 자막보다 정보가 적을 수 있습니다.
              </AlertDescription>
            </Alert>
          )}

          {video.description.trim() && (
            <div className="mt-6 border-t border-border pt-4">
              <p
                className={
                  descOpen
                    ? "prose text-sm whitespace-pre-wrap text-text-2"
                    : "prose line-clamp-4 text-sm whitespace-pre-wrap text-text-2"
                }
              >
                {video.description}
              </p>
              <Button
                type="button"
                variant="link"
                size="xs"
                className="mt-1 px-0"
                onClick={() => setDescOpen((v) => !v)}
              >
                {descOpen ? "설명 접기" : "설명 전체 보기"}
              </Button>
            </div>
          )}
        </div>

        {/* ---------- 우: 명령 패널 ---------- */}
        <div className="lg:sticky lg:top-24">
          {/* 모바일 트리거 — 48px 한 줄. 데스크톱에서는 보이지 않습니다 */}
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 z-[var(--z-sheet)] flex h-12 w-full items-center justify-between border-t border-border bg-elevated px-4 font-semibold text-text shadow-elevated lg:hidden"
            style={{ paddingBottom: "var(--spacing-safe-bottom)" }}
            aria-expanded={sheetOpen}
            aria-controls="video-command-panel"
            onClick={() => setSheetOpen((v) => !v)}
          >
            기록하기
            <span aria-hidden="true">{sheetOpen ? "▾" : "▴"}</span>
          </button>

          <div
            id="video-command-panel"
            role="dialog"
            aria-modal="false"
            aria-label="기록 명령"
            className={
              sheetOpen
                ? "fixed inset-x-0 bottom-12 z-[var(--z-sheet)] max-h-[70vh] overflow-y-auto border-t border-border bg-elevated p-4 shadow-elevated lg:static lg:block lg:max-h-none lg:overflow-visible lg:rounded-none lg:border lg:border-border lg:bg-bg lg:p-5 lg:shadow-none"
                : "hidden lg:static lg:block lg:max-h-none lg:overflow-visible lg:rounded-none lg:border lg:border-border lg:bg-bg lg:p-5 lg:shadow-none"
            }
          >
            {error && (
              <Alert
                variant={error.kind === "daily" || error.kind === "no_caption" ? "warn" : "danger"}
                className="mb-4"
              >
                <AlertTitle>{ERROR_TITLE[error.kind]}</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            {!geminiEnabled && (
              <Alert variant="warn" className="mb-4">
                <AlertTitle>키가 없습니다</AlertTitle>
                <AlertDescription>
                  <code className="font-mono">GEMINI_API_KEY</code> 가 없어 초안을 만들 수 없습니다.
                </AlertDescription>
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="video-instruction">명령</FieldLabel>
              <div className="flex flex-wrap gap-1.5" aria-live="polite">
                {PRESETS.map((p) => (
                  <Chip
                    key={p}
                    asChild
                    variant={instruction === p ? "active" : "default"}
                  >
                    <button type="button" onClick={() => setInstruction(p)}>
                      {p}
                    </button>
                  </Chip>
                ))}
              </div>
              <Textarea
                id="video-instruction"
                className="mt-2 h-24 resize-none"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="예: 핵심만 3줄로, 초보자도 이해할 수 있게"
              />
            </Field>

            <div className="mt-3 flex flex-wrap gap-2">
              {streaming && (
                <Button type="button" variant="outline" onClick={() => abortRef.current?.abort()}>
                  중단
                </Button>
              )}
              <Button
                type="button"
                onClick={() => void generate()}
                disabled={streaming || !geminiEnabled}
              >
                {streaming ? "만드는 중…" : "초안 만들기"}
              </Button>
            </div>

            {/* ---------- 결과 ---------- */}
            {(draft || streaming) && (
              <section className="mt-6 border-t border-border pt-4">
                <div
                  className="flex items-baseline justify-between gap-3 font-mono text-[0.6875rem] tracking-[0.08em] text-text-muted"
                  aria-live="polite"
                  aria-busy={streaming}
                >
                  <span>초안</span>
                  {usage && (
                    <span>
                      입력 {usage.input.toLocaleString()} · 출력 {usage.output.toLocaleString()} 토큰
                    </span>
                  )}
                </div>

                {/* 실제로 무엇을 근거로 썼는지 — 모델 출력이 아니라 응답 헤더로 압니다 */}
                {source === "description" && (
                  <p className="mt-2 text-[0.75rem] text-warn">
                    자막을 받지 못해 영상 설명만으로 작성했습니다. 자막보다 정보가 적을 수
                    있습니다.
                  </p>
                )}

                <div className="mt-3">
                  {parsed.title && (
                    <h2 className="text-h4 leading-snug font-semibold text-text">{parsed.title}</h2>
                  )}
                  {parsed.summary && <p className="mt-1 text-sm text-text-2">{parsed.summary}</p>}
                  {previewTree ? (
                    <div className="prose mt-3">
                      <Markdown tree={previewTree} />
                    </div>
                  ) : (
                    <p className="prose mt-3">{parsed.body || draft}</p>
                  )}
                  {/* 스피너·스켈레톤 없이 캐럿 하나로만 알립니다 */}
                  {streaming && <span className="streaming-caret" aria-hidden="true" />}
                </div>

                {/* 3분기 — 「초안 저장」이 1차이자 첫 탭 대상 */}
                {!streaming && parsed.title && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void keep()} disabled={saving}>
                      {saving ? "저장 중…" : "초안 저장"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void generate()}
                      disabled={saving}
                    >
                      다시 생성
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
