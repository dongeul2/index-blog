"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Channel } from "@/lib/project-types";
import { addChannel, lookupChannel, removeChannel } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Toast,
  ToastAction,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

type Found = { channel: Channel; thumbnail: string | null; already: boolean };

/** 지운 채널 한 건. 실행취소를 위해 값을 그대로 들고 있습니다. */
type Undo = { channel: Channel };

export function ChannelManager({
  channels,
  postsPerChannel,
  quotaEmpty,
}: {
  channels: Channel[];
  /** 채널별로 이미 쓴 요약 글 수 */
  postsPerChannel: Record<string, number>;
  /** 조회 쿼터가 바닥이면 찾기 입력을 막습니다 */
  quotaEmpty: boolean;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);

  async function look() {
    setBusy(true);
    setError(null);
    setFound(null);
    const result = await lookupChannel(input);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFound({ channel: result.channel, thumbnail: result.thumbnail, already: result.already });
  }

  async function add() {
    if (!found) return;
    setBusy(true);
    const result = await addChannel(found.channel);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFound(null);
    setInput("");
    router.refresh();
  }

  /**
   * 삭제는 확인 모달 대신 실행취소입니다.
   *
   * 채널을 지워도 그 채널에서 나온 글은 그대로 남습니다 — 되돌리기 쉬운 일에
   * 모달을 세우면 자주 하는 일이 번거로워집니다. 대신 토스트가 4초 동안 남습니다.
   */
  async function remove(channel: Channel) {
    setBusy(true);
    const result = await removeChannel(channel.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUndo({ channel });
    router.refresh();
  }

  async function restore() {
    if (!undo) return;
    setUndo(null);
    // 다시 넣는 것은 등록과 같은 일입니다 — API를 또 부르지 않습니다.
    const result = await addChannel(undo.channel);
    if (!result.ok) setError(result.error);
    router.refresh();
  }

  return (
    <ToastProvider swipeDirection="left">
      {error && (
        <Alert variant="danger" className="mt-6 max-w-(--container-prose)">
          <AlertTitle>처리하지 못했습니다</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ---------- 등록 ---------- */}
      <section className="mt-8 max-w-(--container-prose)">
        <Field>
          <FieldLabel htmlFor="channel-input">채널 등록</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <Input
              id="channel-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim() && !quotaEmpty) void look();
              }}
              placeholder="youtube.com/@channel · @handle · UC…"
              className="h-11 flex-1 font-mono text-[0.8125rem]"
              disabled={quotaEmpty}
              aria-describedby="channel-input-hint"
            />
            <Button
              type="button"
              onClick={() => void look()}
              disabled={busy || quotaEmpty || !input.trim()}
            >
              {busy ? "찾는 중…" : "찾기"}
            </Button>
          </div>
          <FieldDescription id="channel-input-hint">
            {quotaEmpty
              ? "오늘 쓸 수 있는 조회 쿼터가 없어 채널을 찾을 수 없습니다. PT 자정에 리셋됩니다."
              : "찾기는 1유닛을 씁니다. 등록한 뒤로는 저장된 값만 읽습니다."}
          </FieldDescription>
        </Field>

        {/* 찾은 결과 — 등록 전에 사람이 확인합니다 */}
        {found && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-border bg-bg-subtle px-4 py-3">
            {/* 누르면 새 탭에서 채널이 열립니다 — 등록 전에 진짜 그 채널인지 눈으로 확인합니다.
                '구독에 넣기' 버튼은 링크 밖에 둡니다. */}
            <a
              href={found.channel.url ?? undefined}
              target="_blank"
              rel="noreferrer noopener"
              className="group flex min-w-0 items-center gap-3"
            >
              {/* 목록·칩에는 아바타를 두지 않지만, 등록 직전 확인에는 있는 편이 낫습니다 —
                  이름이 비슷한 채널을 잘못 넣는 것을 여기서 막습니다. */}
              {found.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={found.thumbnail}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 border border-border"
                />
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-text group-hover:underline">
                  {found.channel.name} <span aria-hidden="true">↗</span>
                  <span className="sr-only">(새 탭에서 채널 열기)</span>
                </p>
                <p className="truncate text-caption tabular-nums text-text-muted">
                  {found.channel.handle ?? found.channel.id}
                </p>
              </div>
            </a>
            {found.already ? (
              <p className="text-caption text-text-2">이미 구독 중인 채널입니다.</p>
            ) : (
              <Button type="button" size="sm" onClick={() => void add()} disabled={busy}>
                구독에 넣기
              </Button>
            )}
          </div>
        )}
      </section>

      {/* ---------- 목록 ---------- */}
      <section className="mt-10">
        <p className="text-[0.8125rem] font-semibold text-text-2 tabular-nums">
          구독 {channels.length}개
        </p>

        {channels.length > 0 ? (
          <ul className="mt-3 border-t border-border">
            {channels.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{c.name}</p>
                  <p className="truncate text-caption tabular-nums text-text-muted">
                    {c.handle ?? c.id}
                    <span aria-hidden="true"> · </span>
                    요약 글 {postsPerChannel[c.id] ?? 0}편
                  </p>
                </div>

                {c.url && (
                  <Button asChild variant="ghost" size="xs">
                    <a href={c.url} target="_blank" rel="noreferrer noopener">
                      채널 열기 <span aria-hidden="true">↗</span>
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  onClick={() => void remove(c)}
                  disabled={busy}
                >
                  구독 끊기
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state mt-3">
            <p>아직 구독한 채널이 없습니다.</p>
            <p className="mt-2 text-caption text-text-muted">
              채널 주소를 위에 붙여 넣으면 영상 브라우즈에 그 채널의 최신 업로드가 실립니다.
            </p>
          </div>
        )}
      </section>

      {/* 실행취소가 있는 알림이라 role="alert" 입니다 */}
      <Toast
        open={undo !== null}
        onOpenChange={(open) => !open && setUndo(null)}
        type="foreground"
      >
        <div className="min-w-0">
          <ToastTitle>구독을 끊었습니다</ToastTitle>
          <ToastDescription>{undo?.channel.name}</ToastDescription>
        </div>
        <ToastAction altText="구독 복구" onClick={() => void restore()}>
          실행취소
        </ToastAction>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
