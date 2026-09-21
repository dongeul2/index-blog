/**
 * AI 호출의 순수 부분 — 타입과 파싱.
 *
 * `provider.ts`는 `server-only`라 클라이언트 컴포넌트에서 import할 수 없습니다.
 * 에디터·요약 화면(클라이언트)과 라우트 핸들러(서버)가 같은 타입을 봐야 해서 따로 뺐습니다.
 */

/** 에디터의 AI 보조 작업. DB `ai_tasks.task`의 CHECK와 같은 목록입니다. */
export type AiTask = "summary" | "tags" | "titles" | "polish" | "expand";

export const AI_TASKS: AiTask[] = ["summary", "tags", "titles", "polish", "expand"];

export function isAiTask(v: string): v is AiTask {
  return (AI_TASKS as string[]).includes(v);
}

/** 드롭다운 한 항목. 남은 여유는 한도를 모르면 null입니다. */
export type ModelChoice = {
  id: string;
  label: string;
  description: string;
  /** 오늘 남은 요청 수. 한도 미설정이면 null — 0과 구별해야 합니다. */
  remaining: number | null;
};

export type CommitForPrompt = {
  sha: string;
  message: string;
  committedAt: string;
  files?: string[];
};

export type SummaryRequest = {
  projectName: string;
  repo: string;
  /** 사람이 읽을 기간 표기 */
  period: string;
  commits: CommitForPrompt[];
  /** 왜 그렇게 했는지. 커밋 메시지에 없는 것은 여기서만 옵니다. */
  memo: string;
  /** 없으면 작업별 기본 모델을 씁니다. */
  model?: string;
};

/** `TITLE: / SUMMARY: / --- / 본문` 을 갈라냅니다. 스트리밍 중에도 부분적으로 동작합니다. */
export function parseDraft(text: string): { title: string; summary: string; body: string } {
  const title = text.match(/^TITLE:\s*(.*)$/m)?.[1]?.trim() ?? "";
  const summary = text.match(/^SUMMARY:\s*(.*)$/m)?.[1]?.trim() ?? "";
  const split = text.indexOf("\n---");
  const body = split >= 0 ? text.slice(split + 4).replace(/^\n+/, "") : "";
  return { title, summary, body };
}

/** 스트림 본문 뒤에 붙는 제어 줄. 화면에서 잘라 내고 사용량·오류를 읽습니다. */
export const USAGE_MARK = "[[USAGE]]";
export const ERROR_MARK = "[[ERROR]]";

/** 스트림 끝에 실려 오는 실제 사용량. */
export type StreamUsage = {
  model: string;
  input: number;
  /** 사고 토큰을 포함합니다 — 둘 다 출력으로 청구됩니다. */
  output: number;
};

/**
 * 스트림 끝에 실려 오는 오류.
 *
 * `kind`가 화면의 분기를 정합니다. `daily`면 재시도 버튼을 띄우지 않고
 * 다른 모델을 권합니다 — 같은 모델로 다시 불러 봐야 쿼터만 더 씁니다.
 */
export type StreamError = {
  kind: "rate" | "daily" | "auth" | "other";
  message: string;
  model: string;
  /** daily일 때만. 다음 PT 자정의 ISO 시각. */
  resetAt?: string;
};
