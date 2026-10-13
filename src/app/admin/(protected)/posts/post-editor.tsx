"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { RichEditor } from "@/components/rich/rich-editor";
import { richReadingMinutes, richText, type RichDoc } from "@/lib/rich";
import { parseMarkdown, prepare, readingMinutes } from "@/lib/markdown";
import { CATEGORIES, CATEGORY_LABEL, type Category, type Source } from "@/lib/content-types";
import { STATUS_LABEL, type PostStatus } from "@/lib/post-status";
import { deletePost, savePost, type PostInput } from "./actions";
import { assist } from "./ai-actions";
import type { AssistTask } from "@/lib/ai/prompts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldRow } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SOURCES: { value: Source; label: string }[] = [
  { value: "manual", label: "직접 씀" },
  { value: "youtube-summary", label: "영상 요약" },
  { value: "slack-claude-code", label: "개발 로그" },
];

const STATUSES: PostStatus[] = ["draft", "queued", "published", "failed"];

export type EditorPost = {
  originalSlug: string | null;
  slug: string;
  title: string;
  category: Category;
  status: PostStatus;
  source: Source;
  sourceRef: string;
  project: string;
  channel: string;
  summary: string;
  tags: string;
  body: string;
  /** 에디터 문서. null이면 예전 마크다운 글(body) */
  doc: RichDoc | null;
  publishedAt: string | null;
};

/* ---------- 발행 시각: ISO ↔ 서울 기준 date/time 입력 ---------- */

const seoulParts = (iso: string) => {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
};

/** 입력값은 언제나 서울 시간으로 읽습니다 — 사이트가 KST 기준입니다. */
const toIso = (date: string, time: string) =>
  date ? new Date(`${date}T${time || "00:00"}:00+09:00`).toISOString() : null;

/**
 * "지금"은 렌더 중에 읽으면 안 되는 값입니다(순수하지 않음).
 * 30초 단위로 끊어 안정된 스냅샷을 만들고, 바뀔 때만 다시 그립니다.
 * 예약 발행 여부를 판단하는 데 30초 오차는 문제가 되지 않습니다.
 */
const TICK = 30_000;
const subscribeNow = (onChange: () => void) => {
  const id = setInterval(onChange, TICK);
  return () => clearInterval(id);
};
const useNow = () =>
  useSyncExternalStore(
    subscribeNow,
    () => Math.floor(Date.now() / TICK) * TICK,
    () => 0,
  );

export function PostEditor({ post }: { post: EditorPost }) {
  const router = useRouter();
  const [draft, setDraft] = useState(post);
  // 마크다운으로 쓰인 예전 글만 마크다운 화면으로 엽니다. 새 글과 에디터 글은 블로그형 에디터.
  const [richMode] = useState(() => post.doc !== null || post.body.trim() === "");
  const [confirmed, setConfirmed] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // AI 보조 — 한 번에 하나만. 결과는 입력칸에 바로 넣되 제목만은 후보로 보여 주고 고르게 합니다.
  const [aiBusy, setAiBusy] = useState<AssistTask | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);

  const initial = post.publishedAt ? seoulParts(post.publishedAt) : { date: "", time: "" };
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const syncing = useRef<"editor" | "preview" | null>(null);

  const set = <K extends keyof EditorPost>(key: K, value: EditorPost[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // 본문이나 제목이 바뀌면 "미리보기를 확인했다"는 사실이 더는 유효하지 않습니다.
    if (key === "body" || key === "doc" || key === "title") setConfirmed(false);
  };

  const now = useNow();
  const publishedAt = toIso(date, time);
  const scheduled = Boolean(publishedAt && now > 0 && new Date(publishedAt).getTime() > now);

  // 미리보기는 실제 본문과 같은 파이프라인을 씁니다 — 미리보기가 곧 결과입니다.
  const tree = useMemo(() => {
    const t = parseMarkdown(draft.body);
    prepare(t);
    return t;
  }, [draft.body]);
  const minutes = useMemo(
    () => (richMode ? richReadingMinutes(draft.doc) : readingMinutes(tree)),
    [richMode, draft.doc, tree],
  );
  // 에디터는 쓰는 화면이 곧 결과 화면이라 「미리보기 확인」 단계가 필요 없습니다
  const reviewed = richMode || confirmed;

  const input = (): PostInput => ({ ...draft, publishedAt });

  async function save(next?: Partial<EditorPost>) {
    setBusy(true);
    setError(null);
    const payload = { ...input(), ...next };
    const result = await savePost(payload);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setSavedAt(result.savedAt);
    if (next) setDraft((d) => ({ ...d, ...next }));

    // 새 글이었으면 편집 주소로 옮겨 이후 자동 저장이 갱신으로 이어지게 합니다.
    if (!draft.originalSlug || draft.slug !== draft.originalSlug) {
      setDraft((d) => ({ ...d, originalSlug: result.slug, slug: result.slug }));
      router.replace(`/admin/posts/${result.slug}`);
    }
    return true;
  }

  // 자동 저장 — 이미 저장된 글에만. 새 글은 첫 저장을 손으로 눌러야 합니다.
  useEffect(() => {
    if (!draft.originalSlug) return;
    const t = setTimeout(() => {
      void save();
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 초안 내용이 바뀔 때만 예약합니다
  }, [draft, date, time]);

  /** 두 창의 스크롤을 비율로 맞춥니다. 서로를 다시 흔들지 않도록 방향을 잠급니다. */
  function sync(from: "editor" | "preview") {
    if (syncing.current && syncing.current !== from) return;
    const a = from === "editor" ? editorRef.current : previewRef.current;
    const b = from === "editor" ? previewRef.current : editorRef.current;
    if (!a || !b) return;

    const range = a.scrollHeight - a.clientHeight;
    if (range <= 0) return;

    syncing.current = from;
    b.scrollTop = (a.scrollTop / range) * (b.scrollHeight - b.clientHeight);
    requestAnimationFrame(() => {
      syncing.current = null;
    });
  }

  async function suggest(task: AssistTask) {
    setAiBusy(task);
    setAiError(null);
    const result = await assist(task, {
      title: draft.title,
      summary: draft.summary,
      body: richMode ? richText(draft.doc) : draft.body,
    });
    setAiBusy(null);

    if (!result.ok) {
      setAiError(result.error.message);
      return;
    }
    if (result.task === "summary") set("summary", result.summary);
    if (result.task === "tags") set("tags", result.tags);
    if (result.task === "titles") setTitleOptions(result.titles);
  }

  /** AI 버튼 하나. 도는 동안엔 모든 AI 버튼을 잠급니다 — 쿼터를 겹쳐 쓰지 않게. */
  const aiButton = (task: AssistTask, label: string) => (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="flex-none"
      onClick={() => void suggest(task)}
      disabled={aiBusy !== null}
      aria-busy={aiBusy === task}
    >
      {aiBusy === task ? "생각 중…" : label}
    </Button>
  );

  async function remove() {
    setConfirmOpen(false);
    if (!draft.originalSlug) return;
    setBusy(true);
    const result = await deletePost(draft.originalSlug);
    setBusy(false);
    if (result.ok) router.push("/admin");
    else setError(result.error ?? "지우지 못했습니다.");
  }

  return (
    <div className="editor">
      {/* ---------- 머리 ---------- */}
      <header className="editor__head">
        <div className="editor__head-row">
          <p className="editor__crumb">
            <Link href="/admin">← 대시보드</Link>
          </p>
          <p className="editor__saved" role="status" aria-live="polite">
            {busy
              ? "저장 중…"
              : savedAt
                ? `저장됨 ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", timeStyle: "medium" }).format(new Date(savedAt))}`
                : draft.originalSlug
                  ? "변경 사항 없음"
                  : "아직 저장하지 않음"}
          </p>
        </div>

        <Input
          className="mt-3 h-auto rounded-none border-0 border-b border-transparent bg-transparent px-0 py-1 text-[2rem] leading-[1.18] font-extrabold tracking-[-0.035em] text-text placeholder:text-border-strong focus:border-b-accent focus-visible:outline-offset-4"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="제목"
          aria-label="제목"
        />

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {titleOptions.length === 0 ? (
            aiButton("titles", "AI 제목 후보")
          ) : (
            <>
              {titleOptions.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant="outline"
                  size="xs"
                  className="h-auto min-h-8 py-1 text-left font-sans whitespace-normal"
                  onClick={() => {
                    set("title", t);
                    setTitleOptions([]);
                  }}
                >
                  {t}
                </Button>
              ))}
              <Button type="button" variant="ghost" size="xs" onClick={() => setTitleOptions([])}>
                닫기
              </Button>
            </>
          )}
        </div>

        {aiError && (
          <Alert variant="danger" className="mt-4 max-w-(--container-prose)">
            <AlertTitle>AI 제안을 받지 못했습니다</AlertTitle>
            <AlertDescription>{aiError}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mt-4 max-w-(--container-prose)">
            <AlertTitle>저장하지 못했습니다</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </header>

      {/* ---------- 메타 ---------- */}
      <FieldGroup className="mt-6">
        <Field>
          <FieldLabel htmlFor="post-slug">주소 (slug)</FieldLabel>
          <Input
            id="post-slug"
            value={draft.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="비워 두면 제목으로 자동"
            className="font-mono text-[0.8125rem]"
          />
          <FieldDescription>비워 두면 저장할 때 제목으로 만듭니다. 직접 쓸 땐 영소문자·숫자·하이픈만</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="post-category">분류</FieldLabel>
          <Select value={draft.category} onValueChange={(v) => set("category", v as Category)}>
            <SelectTrigger id="post-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="post-status">상태</FieldLabel>
          <Select value={draft.status} onValueChange={(v) => set("status", v as PostStatus)}>
            <SelectTrigger id="post-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((st) => (
                <SelectItem key={st} value={st}>
                  {STATUS_LABEL[st]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="post-source">출처</FieldLabel>
          <Select value={draft.source} onValueChange={(v) => set("source", v as Source)}>
            <SelectTrigger id="post-source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((src) => (
                <SelectItem key={src.value} value={src.value}>
                  {src.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {draft.source === "manual" ? "직접 쓴 글" : "자동 생성으로 표기됩니다"}
          </FieldDescription>
        </Field>

        <Field wide>
          <FieldLabel htmlFor="post-tags">태그</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id="post-tags"
              value={draft.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="react, 접근성, toc"
            />
            {aiButton("tags", "AI 제안")}
          </div>
          <FieldDescription>쉼표로 구분</FieldDescription>
        </Field>

        <Field wide>
          <FieldLabel htmlFor="post-summary">요약</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id="post-summary"
              value={draft.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="목록과 검색에 쓰이는 한 줄"
            />
            {aiButton("summary", "AI 제안")}
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="post-project">프로젝트</FieldLabel>
          <Input
            id="post-project"
            value={draft.project}
            onChange={(e) => set("project", e.target.value)}
            placeholder="index-blog"
            className="font-mono text-[0.8125rem]"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="post-source-ref">출처 ID (영상)</FieldLabel>
          <Input
            id="post-source-ref"
            value={draft.sourceRef}
            onChange={(e) => set("sourceRef", e.target.value)}
            placeholder="dQw4w9WgXcQ"
            className="font-mono text-[0.8125rem]"
          />
          <FieldDescription>
            영상 브라우즈가 「이미 글로 정리함」을 판정하는 값입니다.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="post-channel">채널 ID</FieldLabel>
          <Input
            id="post-channel"
            value={draft.channel}
            onChange={(e) => set("channel", e.target.value)}
            placeholder="UC…"
            className="font-mono text-[0.8125rem]"
          />
          <FieldDescription>홈의 「요즘 보는 것」이 이 값으로 글을 묶습니다.</FieldDescription>
        </Field>

        {/* 발행일 편집 */}
        <Field wide>
          <FieldLabel htmlFor="post-date">발행 시각 (서울)</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="post-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto flex-none"
              aria-label="발행 날짜"
            />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-auto flex-none"
              aria-label="발행 시각"
            />
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-10 border-border"
              onClick={() => {
                const now = seoulParts(new Date().toISOString());
                setDate(now.date);
                setTime(now.time);
              }}
            >
              지금으로 설정
            </Button>
            {scheduled && <Badge variant="scheduled">예약 발행</Badge>}
          </div>
          <FieldDescription role="status" aria-live="polite">
            {scheduled
              ? "미래 시각입니다. 그 시각이 될 때까지 공개 화면에 보이지 않습니다."
              : "비워 두면 초안으로만 남습니다."}
          </FieldDescription>
        </Field>
      </FieldGroup>

      {/* ---------- 본문 ---------- */}
      {richMode ? (
        <div className="mt-8">
          <p className="split__label">
            본문
            <span className="split__count">읽는 시간 {minutes}분</span>
          </p>
          <RichEditor value={draft.doc} onChange={(doc) => set("doc", doc)} />
        </div>
      ) : (
      <div className="split">
        <div className="split__pane">
          <p className="split__label">마크다운</p>
          <Textarea
            ref={editorRef}
            className="h-[min(60vh,40rem)] resize-none overflow-y-auto rounded-none border-0 bg-code-bg p-5 font-mono text-code leading-[1.75] text-code-fg [tab-size:2] focus-visible:outline-offset-[-2px]"
            value={draft.body}
            onChange={(e) => set("body", e.target.value)}
            onScroll={() => sync("editor")}
            spellCheck={false}
            aria-label="본문 마크다운"
          />
        </div>

        <div className="split__pane">
          <p className="split__label">
            미리보기
            <span className="split__count">읽는 시간 {minutes}분</span>
          </p>
          <div ref={previewRef} className="split__preview" onScroll={() => sync("preview")}>
            {draft.body.trim() ? (
              <Markdown tree={tree} />
            ) : (
              <div className="empty-state">본문을 입력하면 여기에 그대로 그려집니다.</div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ---------- 액션 ---------- */}
      <div className="editor__actions">
        {!richMode && (
        <FieldRow>
          <Checkbox
            id="preview-confirmed"
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
          />
          <FieldLabel htmlFor="preview-confirmed" className="font-sans text-sm tracking-normal">
            미리보기를 확인했습니다
          </FieldLabel>
        </FieldRow>
        )}

        <div className="flex flex-wrap gap-2">
          {draft.originalSlug && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
            >
              버리기
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => void save({ status: "draft" })}
            disabled={busy}
          >
            초안 저장
          </Button>

          <Button
            type="button"
            onClick={() => void save({ status: "published" })}
            disabled={busy || !reviewed || !publishedAt}
            aria-describedby="publish-hint"
          >
            {scheduled ? "예약 발행" : "발행"}
          </Button>
        </div>

        <p className="editor__hint" id="publish-hint">
          {!publishedAt
            ? "발행하려면 발행 시각을 정하세요."
            : !reviewed
              ? "미리보기를 확인해야 발행할 수 있습니다."
              : scheduled
                ? "정한 시각이 되면 공개됩니다."
                : "지금 공개됩니다."}
        </p>
      </div>

      {/* 파괴적 액션은 확인을 거칩니다. Dialog가 포커스 가둠과 ESC를 맡습니다. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>이 글을 지울까요?</DialogTitle>
            <DialogDescription>
              <strong className="font-semibold text-text">{draft.title || draft.slug}</strong> 을(를)
              되돌릴 수 없이 지웁니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {/* 파괴적 액션이 기본값이 되지 않도록 취소에 먼저 포커스가 갑니다 */}
            <Button type="button" variant="outline" autoFocus onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button type="button" variant="destructive" onClick={() => void remove()}>
              지우기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
