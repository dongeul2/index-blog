import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classify, humanMessage, messageOf, type Classified } from "./errors";
import { labelOf, resolveModel } from "./models";
import { logUsage, usageClient } from "./usage";
import { ERROR_MARK, USAGE_MARK, type AiTask, type StreamError, type StreamUsage } from "./shared";

// 타입과 파싱은 클라이언트도 써야 해서 shared.ts 에 있습니다.
export * from "./shared";

/**
 * Gemini 호출.
 *
 * **자동으로 도는 경로는 없습니다.** 모든 호출은 사람이 버튼을 눌러야 시작합니다 —
 * 이것이 비용 통제의 핵심이고, 무엇을 기록으로 남길지는 사람이 정해야 한다는
 * 기획서의 방향이기도 합니다.
 *
 * 사용량 기록은 이 파일 안에서 자동으로 일어납니다. 부르는 쪽에 로깅 코드를 두면
 * 한 곳만 빠뜨려도 집계가 조용히 틀어집니다.
 */

export function hasApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function client(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

/** 분당 한도에 걸렸을 때만 재시도합니다. 일일 한도는 몇 번을 불러도 풀리지 않습니다. */
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ============================================================
   사용량 읽기
   ============================================================ */

/**
 * Interactions API의 usage는 snake_case입니다
 * (구형 `models.generateContent`의 `usageMetadata.promptTokenCount` 와 다릅니다).
 *
 * 사고 토큰(`total_thought_tokens`)은 따로 오지만 출력으로 청구됩니다.
 * 빼먹으면 출력 토큰이 과소 집계됩니다.
 */
type RawUsage = {
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_thought_tokens?: number;
};

function readUsage(u: RawUsage | undefined, model: string): StreamUsage {
  return {
    model,
    input: u?.total_input_tokens ?? 0,
    output: (u?.total_output_tokens ?? 0) + (u?.total_thought_tokens ?? 0),
  };
}

/* ============================================================
   호출
   ============================================================ */

export type CallOptions = {
  task: AiTask;
  /** 드롭다운에서 고른 모델. 없으면 작업별 기본값. */
  model?: string;
  system?: string;
  input: string;
  /** 글 생성으로 이어진 호출만 채웁니다. */
  postId?: number | null;
};

export type GenerateResult =
  | { ok: true; text: string; usage: StreamUsage }
  | { ok: false; error: StreamError };

/**
 * 한 번에 결과를 받습니다 — 요약문·태그·제목처럼 짧은 것들.
 *
 * 실패해도 기록합니다. Gemini는 실패 시 usageMetadata가 없을 수 있어 그때는 0입니다.
 */
export async function generate(opts: CallOptions): Promise<GenerateResult> {
  const model = await resolveModel(opts.task, opts.model);

  if (!hasApiKey()) {
    const error: StreamError = {
      kind: "auth",
      model,
      message: "GEMINI_API_KEY 가 .env.local 에 없습니다.",
    };
    return { ok: false, error };
  }

  const db = await usageClient();
  let last: Classified | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const interaction = await client().interactions.create({
        model,
        input: opts.input,
        system_instruction: opts.system,
        // 응답을 Google 쪽에 남길 이유가 없습니다.
        store: false,
      });

      const usage = readUsage(
        (interaction as { usage?: RawUsage }).usage,
        model,
      );

      await logUsage(
        {
          provider: "gemini",
          operation: "interactions.create",
          promptTokens: usage.input,
          outputTokens: usage.output,
          model,
          postId: opts.postId,
          success: true,
        },
        db ?? undefined,
      );

      return { ok: true, text: interaction.output_text ?? "", usage };
    } catch (e) {
      last = classify(e);

      await logUsage(
        {
          provider: "gemini",
          operation: "interactions.create",
          model,
          postId: opts.postId,
          success: false,
          errorKind: last.kind,
        },
        db ?? undefined,
      );

      // 일일 한도면 여기서 끝입니다. 다시 불러 봐야 쿼터만 더 씁니다.
      if (!last.retryable || attempt === MAX_RETRIES) break;
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }

  const label = await labelOf(model);
  return {
    ok: false,
    error: {
      kind: last?.kind ?? "other",
      model,
      message: last ? humanMessage(last, label) : "알 수 없는 오류",
    },
  };
}

/* ============================================================
   스트리밍
   ============================================================ */

/** 스트림 이벤트는 유니온이 내부 타입이라 필요한 모양만 좁혀 씁니다. */
type StreamEvent = {
  event_type?: string;
  delta?: { type?: string; text?: string };
  usage?: RawUsage;
  metadata?: { total_usage?: RawUsage };
};

/**
 * 흐르는 대로 받습니다 — 초안 다듬기·메모 확장처럼 긴 것들.
 *
 * 라우트 핸들러로 쓰는 이유는 스트리밍입니다. 긴 글 한 편은 수십 초가 걸리는데
 * 그동안 화면이 멈춰 있으면 안 됩니다(디자인 시스템의 `streaming-caret`이 이걸 전제합니다).
 *
 * 본문 뒤에 제어 줄 한 줄이 붙습니다 — 성공이면 `[[USAGE]]{...}`, 실패면 `[[ERROR]]{...}`.
 * 스트림은 헤더가 이미 나간 뒤라 HTTP 상태코드로 실패를 알릴 수 없습니다.
 */
export async function streamGenerate(opts: CallOptions): Promise<ReadableStream<Uint8Array>> {
  const model = await resolveModel(opts.task, opts.model);
  const label = await labelOf(model);

  // 스트림이 흐르기 시작하면 cookies()를 부를 수 없어 미리 잡아 둡니다.
  const db = await usageClient();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (s: string) => controller.enqueue(encoder.encode(s));

      const fail = async (e: unknown) => {
        const c = classify(e);
        await logUsage(
          {
            provider: "gemini",
            operation: "interactions.create",
            model,
            postId: opts.postId,
            success: false,
            errorKind: c.kind,
          },
          db ?? undefined,
        );
        const payload: StreamError = { kind: c.kind, model, message: humanMessage(c, label) };
        send(`\n${ERROR_MARK}${JSON.stringify(payload)}`);
      };

      try {
        if (!hasApiKey()) throw new Error("GEMINI_API_KEY 가 .env.local 에 없습니다.");

        const stream = await client().interactions.create({
          model,
          input: opts.input,
          system_instruction: opts.system,
          store: false,
          stream: true,
        });

        let usage: RawUsage | undefined;

        for await (const raw of stream as AsyncIterable<StreamEvent>) {
          if (raw.event_type === "step.delta" && raw.delta?.type === "text" && raw.delta.text) {
            send(raw.delta.text);
          }
          // 사용량은 step.stop에 실려 오고, delta의 metadata에도 누적본이 옵니다.
          usage = raw.usage ?? raw.metadata?.total_usage ?? usage;
        }

        const read = readUsage(usage, model);
        await logUsage(
          {
            provider: "gemini",
            operation: "interactions.create",
            promptTokens: read.input,
            outputTokens: read.output,
            model,
            postId: opts.postId,
            success: true,
          },
          db ?? undefined,
        );

        // 실제 사용량을 마지막에 실어 보냅니다 — 화면에서 예상치와 비교할 수 있게.
        send(`\n${USAGE_MARK}${JSON.stringify(read)}`);
      } catch (e) {
        try {
          await fail(e);
        } catch (inner) {
          // 오류를 알리다 또 실패하면 남길 수 있는 건 흔적뿐입니다.
          console.error("[ai] 오류 전달 실패:", messageOf(inner));
        }
      } finally {
        controller.close();
      }
    },
  });
}

/** 스트리밍 없이 부를 때도 미리 만든 클라이언트를 재사용할 수 있게 열어 둡니다. */
export type { SupabaseClient };
