"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addBookmark, removeBookmark, type Bookmark } from "./bookmarks-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Toast,
  ToastAction,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

/**
 * 대시보드 바로가기 — 자주 쓰는 외부 도구로 한 번에.
 *
 * 파비콘은 Google의 공개 파비콘 서비스(`s2/favicons`)를 그대로 씁니다 — 키도 서버도
 * 필요 없고, 사이트마다 제각각인 `<link rel="icon">`을 직접 긁어오는 것보다 안정적입니다.
 * 실패하면(파비콘이 없는 사이트) 빈 사각형이 뜰 뿐 화면이 깨지지 않습니다.
 *
 * 삭제는 확인 모달이 아니라 실행취소입니다 — 채널 구독 관리(14)와 같은 이유로,
 * 되돌리기 쉬운 일에 모달을 세우면 자주 하는 일이 번거로워집니다.
 */

function favicon(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
  } catch {
    return null;
  }
}

export function BookmarksWidget({ bookmarks }: { bookmarks: Bookmark[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<Bookmark | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    const result = await addBookmark({ url, title });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUrl("");
    setTitle("");
    setOpen(false);
    router.refresh();
  }

  async function remove(b: Bookmark) {
    setBusy(true);
    const result = await removeBookmark(b.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUndo(b);
    router.refresh();
  }

  async function restore() {
    if (!undo) return;
    setUndo(null);
    const result = await addBookmark({ url: undo.url, title: undo.title });
    if (!result.ok) setError(result.error);
    router.refresh();
  }

  return (
    <ToastProvider swipeDirection="left">
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 font-mono text-[0.6875rem] tracking-[0.08em] text-text-muted">
            바로가기
          </p>

          {bookmarks.map((b) => (
            <div key={b.id} className="group relative">
              <a
                href={b.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-9 items-center gap-2 border border-border bg-bg pr-3 pl-2 text-sm text-text transition-colors hover:border-border-strong hover:bg-bg-subtle hover:no-underline"
              >
                {favicon(b.url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={favicon(b.url)!} alt="" width={16} height={16} className="size-4 shrink-0" />
                )}
                <span className="max-w-40 truncate">{b.title}</span>
              </a>
              {/* 카드 hover에서만 드러납니다 — 평소엔 조용합니다 */}
              <button
                type="button"
                onClick={() => void remove(b)}
                disabled={busy}
                aria-label={`${b.title} 바로가기 삭제`}
                className="absolute -top-1.5 -right-1.5 hidden size-4 items-center justify-center border border-border-strong bg-bg text-[10px] leading-none text-text-muted opacity-0 transition-opacity group-hover:flex group-hover:opacity-100 hover:border-danger hover:text-danger focus-visible:flex focus-visible:opacity-100"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}

          {open ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Input
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL"
                className="h-9 w-40 font-mono text-xs"
              />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="이름"
                className="h-9 w-28"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && url.trim() && title.trim()) void add();
                }}
              />
              <Button type="button" size="sm" onClick={() => void add()} disabled={busy}>
                추가
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
              >
                취소
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="xs" className="h-9" onClick={() => setOpen(true)}>
              + 바로가기
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="danger" className="mt-3 max-w-(--container-prose)">
            <AlertTitle>처리하지 못했습니다</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <Toast open={undo !== null} onOpenChange={(o) => !o && setUndo(null)} type="foreground">
        <div className="min-w-0">
          <ToastTitle>바로가기를 지웠습니다</ToastTitle>
          <ToastDescription>{undo?.title}</ToastDescription>
        </div>
        <ToastAction altText="바로가기 복구" onClick={() => void restore()}>
          실행취소
        </ToastAction>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
