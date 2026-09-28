/**
 * 429를 두 갈래로 가릅니다.
 *
 * 같은 429지만 대응이 정반대입니다 —
 * 분당 한도(RPM/TPM)는 잠깐 기다리면 풀리고, 일일 한도(RPD)는 PT 자정까지 복구되지
 * 않습니다. 일일 한도에 걸렸는데 재시도하면 쿼터만 더 쓰고 복구도 안 됩니다.
 *
 * 문서상 응답 본문의 `error.code`가 셋으로 갈립니다:
 *   rate_limit_exceeded  분당·초당 한도
 *   too_many_requests    단기 스로틀
 *   quota_exceeded       일일 한도
 *
 * 다만 SDK의 `ApiError`는 `status`와 `message`만 노출하고 `code`를 구조적으로 주지
 * 않습니다. 그래서 메시지에서 찾습니다. 형식이 바뀌면 못 알아볼 수 있으니,
 * 못 알아본 429는 `rate`로 둡니다 — 근거는 아래 classify() 주석에 있습니다.
 */

export type ErrorKind = "rate" | "daily" | "auth" | "other";

export type Classified = {
  kind: ErrorKind;
  message: string;
  status?: number;
  /** 재시도해도 되는가. daily는 절대 false입니다. */
  retryable: boolean;
};

/** 일일 한도임이 분명한 신호들. */
const DAILY = /quota_exceeded|per\s*day|requests?\s*per\s*day|\bRPD\b|daily\s*(limit|quota)/i;

/** 분당 한도임이 분명한 신호들. */
const RATE = /rate_limit_exceeded|too_many_requests|per\s*minute|\bRPM\b|\bTPM\b|per\s*second/i;

function statusOf(e: unknown): number | undefined {
  if (typeof e !== "object" || e === null) return undefined;
  const s = (e as { status?: unknown }).status;
  return typeof s === "number" ? s : undefined;
}

export function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

/**
 * 오류를 분류합니다.
 *
 * 못 알아본 429를 `rate`로 두는 이유:
 * 일일 한도를 분당으로 잘못 보면 백오프로 두세 번 더 부르고 맙니다 — 손해가 작고 끝이
 * 있습니다. 반대로 분당 한도를 일일로 잘못 보면 1분이면 풀릴 일에 대고 "오늘은 끝났다"고
 * 말하게 됩니다. 거짓말을 하고 작업을 멈추게 하는 쪽이 더 나쁩니다.
 * 재시도 횟수를 작게 묶어 두면(provider.ts) 전자의 손해는 한 줌입니다.
 */
export function classify(e: unknown): Classified {
  const message = messageOf(e);
  const status = statusOf(e);

  if (status === 401 || status === 403) {
    return { kind: "auth", message, status, retryable: false };
  }

  if (status === 429 || DAILY.test(message) || RATE.test(message)) {
    // 일일을 먼저 봅니다 — 둘 다 걸리면 더 무거운 쪽으로 판단해야 합니다.
    if (DAILY.test(message)) {
      return { kind: "daily", message, status, retryable: false };
    }
    return { kind: "rate", message, status, retryable: true };
  }

  // 5xx는 일시적입니다. 4xx는 우리가 잘못 보낸 것이라 다시 보내도 같습니다.
  const retryable = status === undefined ? false : status >= 500;
  return { kind: "other", message, status, retryable };
}

/** 사람에게 보여 줄 문구. 무엇이 막혔고 무엇을 하면 되는지까지 말합니다. */
export function humanMessage(c: Classified, modelLabel: string): string {
  switch (c.kind) {
    case "daily":
      return `${modelLabel}의 일일 한도를 다 썼습니다. PT 자정에 리셋됩니다.`;
    case "rate":
      return `${modelLabel}이 잠시 몰렸습니다. 몇 초 뒤 다시 시도해 보세요.`;
    case "auth":
      return "GEMINI_API_KEY 가 없거나 권한이 없습니다. 환경변수(로컬 .env.local · 배포 Vercel)를 확인하세요.";
    default:
      return c.message;
  }
}
