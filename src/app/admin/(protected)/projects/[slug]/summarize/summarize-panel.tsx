"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { parseMarkdown, prepare } from "@/lib/markdown";
import {
  ERROR_MARK,
  USAGE_MARK,
  parseDraft,
  type StreamError,
  type StreamUsage,
  type SummaryRequest,
} from "@/lib/ai/shared";
import { saveDraft } from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type PanelCommit = {
  sha: string;
  message: string;
  committedAt: string;
};

type Range = "today" | "yesterday" | "week" | "all";

const RANGE_LABEL: Record<Range, string> = {
  today: "오늘",
  yesterday: "어제",
  week: "최근 7일",
  all: "전체",
};

/** 서울 기준 날짜 문자열 */
const seoulDay = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));

const daysAgo = (n: number) =>
  seoulDay(new Date(Date.now() - n * 86_400_000).toISOString());

export function SummarizePanel({
  projectSlug,
  projectName,
  repo,
  commits,
}: {
  projectSlug: string;
  projectName: string;
  repo: string;
  commits: PanelCommit[];
}) {
  const router = useRouter();
  const [range, setRange] = useState<Range>("week");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [memo, setMemo] = useState("");

  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [usage, setUsage] = useState<StreamUsage | null>(null);
  const [error, setError] = useState<StreamError | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 기간으로 먼저 거르고, 그 안에서 개별 커밋을 뺄 수 있습니다.
  const inRange = useMemo(() => {
    if (range === "all") return commits;
    const today = daysAgo(0);
    return commits.filter((c) => {
      const day = seoulDay(c.committedAt);
      if (range === "today") return day === today;
      if (range === "yesterday") return day === daysAgo(1);
      return day >= daysAgo(6);
    });
  }, [commits, range]);

  const chosen = inRange.filter((c) => !excluded.has(c.sha));

  const request = (): SummaryRequest => ({
    projectName,
    repo,
    period: RANGE_LABEL[range],
    commits: chosen.map((c) => ({
      sha: c.sha,
      message: c.message,
      committedAt: c.committedAt,
    })),
    memo,
  });

  function toggle(sha: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(sha)) next.delete(sha);
      else next.add(sha);
      return next;
    });
  }

  /** 모델을 모르는 지점(네트워크·검증 실패)의 오류도 같은 모양으로 다룹니다. */
  const plainError = (message: string): StreamError => ({ kind: "other", message, model: "" });

  async function generate() {
    setStreaming(true);
    setDraft("");
    setUsage(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request()),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const message = await response.json().catch(() => ({ error: "요청이 실패했습니다." }));
        setError(plainError(message.error ?? "요청이 실패했습니다."));
        setStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setDraft(text);
      }

      // 제어 줄을 잘라 냅니다.
      // 스트림은 헤더가 이미 나간 뒤라 실패를 상태코드로 알릴 수 없어, 본문 끝에 실려 옵니다.
      const usageAt = text.indexOf(USAGE_MARK);
      const errorAt = text.indexOf(ERROR_MARK);
      if (errorAt >= 0) {
        const raw = text.slice(errorAt + ERROR_MARK.length).trim();
        setError(JSON.parse(raw) as StreamError);
        setDraft(text.slice(0, errorAt));
      } else if (usageAt >= 0) {
        setUsage(JSON.parse(text.slice(usageAt + USAGE_MARK.length)) as StreamUsage);
        setDraft(text.slice(0, usageAt));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(plainError((e as Error).message));
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
    const result = await saveDraft({
      projectSlug,
      title: parsed.title,
      summary: parsed.summary,
      body: parsed.body,
    });
    setSaving(false);
    if (result.ok) router.push(`/admin/posts/${result.slug}`);
    else setError(plainError(result.error));
  }

  return (
    <div className="editor">
      <header className="editor__head">
        <div className="editor__head-row">
          <p className="editor__crumb">
            <Link href={`/admin/projects/${projectSlug}`}>← {projectName}</Link>
          </p>
        </div>
        <h1 className="admin-head__title">작업 요약</h1>
        <p className="admin-head__who">
          커밋을 묶어 개발 일지 초안을 만듭니다. <strong>버튼을 누를 때만</strong> 실행됩니다.
        </p>

        {/* 쿼터 소진은 "실패"가 아니라 "오늘은 여기까지"라, 라벨을 달리 답니다. */}
        {error && (
          <Alert
            variant={error.kind === "daily" ? "warn" : "danger"}
            className="mt-4 max-w-(--container-prose)"
          >
            <AlertTitle>{error.kind === "daily" ? "일일 한도 소진" : "실패"}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
      </header>

      {/* 기간 */}
      <Tabs value={range} onValueChange={(v) => setRange(v as Range)} className="mt-6">
        <TabsList aria-label="기간">
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <TabsTrigger key={r} value={r}>
              {RANGE_LABEL[r]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* 커밋 고르기 */}
      <div className="summarize__commits">
        <p className="text-[0.8125rem] font-semibold text-text-2 tabular-nums">
          커밋 {chosen.length}건 선택됨 {inRange.length !== chosen.length && `(${inRange.length}건 중)`}
        </p>
        {inRange.length > 0 ? (
          <ul className="summarize__list">
            {inRange.map((c) => (
              <li key={c.sha}>
                <label className="summarize__commit">
                  <Checkbox
                    checked={!excluded.has(c.sha)}
                    onCheckedChange={() => toggle(c.sha)}
                    aria-label={`커밋 ${c.sha.slice(0, 7)} 포함`}
                  />
                  <code className="repo-item__hash">{c.sha.slice(0, 7)}</code>
                  <span className="repo-item__msg">{c.message}</span>
                  <time className="repo-item__time" dateTime={c.committedAt}>
                    {seoulDay(c.committedAt)}
                  </time>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">이 기간에 커밋이 없습니다.</div>
        )}
      </div>

      {/* 메모 — '왜'가 들어오는 유일한 자리 */}
      <Field wide className="summarize__memo">
        <FieldLabel htmlFor="summarize-memo">메모 (선택)</FieldLabel>
        <Textarea
          id="summarize-memo"
          className="h-32 resize-none bg-code-bg p-4 font-mono text-code leading-[1.75] text-code-fg"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="왜 그렇게 했는지, 무엇을 고민했는지. 커밋 메시지에 없는 것은 여기서만 들어옵니다."
        />
        <FieldDescription>
          비워 두면 무엇을 했는지 위주로만 씁니다 — 이유를 지어내지 않도록 지시해 두었습니다.
        </FieldDescription>
      </Field>

      <div className="editor__actions">
        <p className="editor__hint">
          {chosen.length === 0
            ? "커밋을 하나 이상 고르세요."
            : "초안은 발행되지 않습니다. 저장하면 에디터로 넘어갑니다."}
        </p>
        <div className="flex flex-wrap gap-2">
          {/* 생성 중에는 「중단」이 첫 탭 대상이어야 합니다 */}
          {streaming && (
            <Button type="button" variant="outline" onClick={() => abortRef.current?.abort()}>
              중단
            </Button>
          )}
          <Button
            type="button"
            onClick={() => void generate()}
            disabled={streaming || chosen.length === 0}
          >
            {streaming ? "만드는 중…" : "초안 만들기"}
          </Button>
        </div>
      </div>

      {/* 결과 */}
      {(draft || streaming) && (
        <section className="summarize__result">
          <div className="split__label" aria-live="polite" aria-busy={streaming}>
            <span>초안</span>
            {usage && (
              <span className="split__count">
                실제 사용: 입력 {usage.input.toLocaleString()} · 출력{" "}
                {usage.output.toLocaleString()} 토큰
              </span>
            )}
          </div>

          <div className="summarize__preview">
            {parsed.title && <h2 className="summarize__title">{parsed.title}</h2>}
            {parsed.summary && <p className="summarize__summary">{parsed.summary}</p>}
            {previewTree ? (
              <Markdown tree={previewTree} />
            ) : (
              <p className="prose">{parsed.body || draft}</p>
            )}
            {/* 스피너·스켈레톤 없이 캐럿 하나로만 알립니다 */}
            {streaming && <span className="streaming-caret" aria-hidden="true" />}
          </div>

          {/* 3분기 — 「초안 저장」이 1차이자 첫 탭 대상입니다 */}
          {!streaming && parsed.title && (
            <div className="summarize__keep flex flex-wrap gap-2">
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
  );
}
