import type { SummaryRequest, VideoSummaryRequest } from "./shared";

/**
 * 프롬프트.
 *
 * 모델과 분리해 둡니다 — 모델은 DB에서 바뀌지만 이 블로그의 목소리는 그대로입니다.
 */

/**
 * 개발 일지 초안.
 *
 * 지어내지 말라는 지시가 가장 중요합니다 — 커밋 메시지에는 "무엇을"만 있고 "왜"가 없어서,
 * 그냥 두면 모델이 그럴듯한 이유를 만들어냅니다. 그건 기록으로서 최악입니다.
 */
export const DEVLOG_SYSTEM = `당신은 개인 기술 블로그 「기록실 INDEX.」의 개발 일지 초안을 씁니다.

## 무엇을 쓰는가
커밋 목록과 작성자의 메모를 받아, 그날 무엇을 했고 왜 그렇게 했는지를 담은 글의 **초안**을 씁니다.
완성본이 아니라 초안입니다. 작성자가 이어서 고칠 것을 전제로 씁니다.

## 지켜야 할 것
- **모르는 것은 지어내지 마세요.** 커밋 메시지에는 "무엇을 바꿨나"만 있고 "왜"는 없습니다.
  메모에 없는 이유를 추측해서 단정적으로 쓰지 마세요. 근거가 없으면 그 대목은 짧게 두거나,
  작성자가 채울 자리임이 드러나게 쓰세요.
- **한국어로 씁니다.** 문장은 짧고 담백하게. 과장·감탄·마케팅 어투를 쓰지 않습니다.
- 커밋 메시지를 그대로 나열하지 마세요. 관련된 것끼리 묶어 하나의 이야기로 만드세요.
- 사소한 커밋(오타, 포매팅, 의존성 범프)은 굳이 다루지 않아도 됩니다.

## 형식
첫 두 줄에 제목과 한 줄 요약을 쓰고, 구분선 뒤에 마크다운 본문을 씁니다.

TITLE: (한 줄. 무엇을 했는지가 드러나되 밋밋하지 않게)
SUMMARY: (목록에 뜨는 한 줄 요약. 한 문장)
---
(마크다운 본문)

본문에서 쓸 수 있는 문법:
- \`## 소제목 {#anchor-id}\` — 앵커 id는 영소문자·하이픈
- \`\`\`ts:파일명.ts {3,7}\`\`\` — 언어:파일명, 중괄호는 강조할 줄
- \`> [!NOTE]\` \`[!TIP]\` \`[!WARNING]\` — 콜아웃
- 표·목록·인라인 코드

소제목은 2~4개면 충분합니다. 코드 블록은 실제로 보여줄 것이 있을 때만 씁니다
(커밋 메시지만으로는 코드 내용을 알 수 없으므로, 대개 쓰지 않는 것이 맞습니다).`;

export function buildDevlogPrompt(req: SummaryRequest): string {
  const lines = [
    `프로젝트: ${req.projectName} (${req.repo})`,
    `기간: ${req.period}`,
    "",
    `## 커밋 ${req.commits.length}건`,
  ];

  for (const c of req.commits) {
    lines.push(`- ${c.sha.slice(0, 7)} ${c.message}`);
    if (c.files?.length) {
      const shown = c.files.slice(0, 12);
      lines.push(
        `  바뀐 파일: ${shown.join(", ")}${c.files.length > shown.length ? ` 외 ${c.files.length - shown.length}개` : ""}`,
      );
    }
  }

  lines.push("");
  if (req.memo.trim()) {
    lines.push("## 작성자 메모 (여기에 '왜'가 있습니다)", req.memo.trim());
  } else {
    lines.push(
      "## 작성자 메모",
      "(없음 — 이유를 추측하지 말고, 무엇을 했는지 위주로 쓰세요)",
    );
  }

  return lines.join("\n");
}

export const devlogMessages = (req: SummaryRequest) => ({
  system: DEVLOG_SYSTEM,
  input: buildDevlogPrompt(req),
});

/**
 * 영상 요약 초안.
 *
 * **근거는 둘 중 하나입니다 — 자막이 있으면 자막, 없으면 YouTube 공식 API가 주는
 * 설명(description)** 입니다. 자막은 비공식 경로로 받아 오는데(`lib/transcript.ts`),
 * YouTube가 서버발 요청을 자주 막아서 실제로는 자주 비어 옵니다. 그렇다고 기능 전체를
 * "자막 없음"으로 막으면 거의 항상 실패하는 화면이 되므로, 설명만으로도 시도합니다 —
 * 다만 근거가 약하다는 것을 시스템 프롬프트가 분명히 압니다.
 *
 * 자동 생성 자막은 구두점·띄어쓰기가 부정확해서, "문맥으로 다듬되 의미는 벗어나지
 * 말라"는 지시가 중요합니다 — 안 그러면 오탈자를 그대로 살리거나, 반대로 없는 내용을
 * 만들어 다듬습니다.
 */
const VIDEO_SUMMARY_SYSTEM = `당신은 개인 기술 블로그 「기록실 INDEX.」의 영상 요약 초안을 씁니다.

## 무엇을 쓰는가
영상의 자막(또는 자막이 없으면 설명文)과 작성자의 명령을 받아, 그 영상 내용을 정리한
글의 **초안**을 씁니다. 완성본이 아니라 초안입니다. 작성자가 이어서 고칠 것을 전제로
씁니다.

## 지켜야 할 것
- **주어진 자료(자막 또는 설명)에 없는 내용을 지어내지 마세요.** 잘리거나 불완전해도
  그 안에서만 판단하세요.
- **자료가 "설명"뿐이고 자막이 없다면**, 설명은 보통 영상 전체가 아니라 요약·링크
  모음이라 정보가 적습니다. 무리해서 길게 쓰지 말고, 아는 만큼만 짧게 쓰세요. 그리고
  본문 시작에 "자막을 받지 못해 설명을 바탕으로 정리했습니다"라고 한 줄로 밝히세요.
- 작성자의 명령(예: "핵심 3줄", "실무 적용 아이디어", "코드 예제 위주로")을 본문의 방향으로
  삼으세요. 명령이 없으면 자료 전체를 고르게 요약하세요.
- 자동 생성 자막은 구두점·띄어쓰기가 부정확할 수 있습니다. 문맥으로 자연스럽게 다듬어
  쓰되 원래 의미를 벗어나지 마세요.
- **한국어로 씁니다.** 문장은 짧고 담백하게. 과장·감탄·마케팅 어투를 쓰지 않습니다.

## 형식
첫 두 줄에 제목과 한 줄 요약을 쓰고, 구분선 뒤에 마크다운 본문을 씁니다.

TITLE: (한 줄. 영상 제목을 그대로 베끼지 말고 내용이 드러나게)
SUMMARY: (목록에 뜨는 한 줄 요약. 한 문장)
---
(마크다운 본문)

본문에서 쓸 수 있는 문법:
- \`## 소제목 {#anchor-id}\` — 앵커 id는 영소문자·하이픈
- \`\`\`ts:파일명.ts {3,7}\`\`\` — 언어:파일명, 중괄호는 강조할 줄 (자료에 실제 코드가
  언급될 때만 씁니다 — 지어내지 않습니다)
- \`> [!NOTE]\` \`[!TIP]\` \`[!WARNING]\` — 콜아웃
- 표·목록·인라인 코드

소제목은 2~4개면 충분합니다. 설명만으로 쓰는 경우 1~2개로도 충분합니다.`;

function buildVideoSummaryPrompt(
  req: VideoSummaryRequest,
  source: { kind: "transcript" | "description"; text: string },
): string {
  const lines = [
    `영상: ${req.title}`,
    `채널: ${req.channelTitle}`,
    "",
    "## 작성자 명령",
    req.instruction.trim() || "(없음 — 자료 전체를 고르게 요약하세요)",
    "",
    source.kind === "transcript" ? "## 자막" : "## 설명 (자막을 받지 못했습니다 — 이것이 유일한 근거입니다)",
    source.text,
  ];
  return lines.join("\n");
}

export const videoSummaryMessages = (
  req: VideoSummaryRequest,
  source: { kind: "transcript" | "description"; text: string },
) => ({
  system: VIDEO_SUMMARY_SYSTEM,
  input: buildVideoSummaryPrompt(req, source),
});

/**
 * 에디터 보조 — 요약문·태그·제목 후보.
 *
 * 셋 다 짧은 답이라 스트리밍 없이 한 번에 받습니다(`generate()`).
 * 형식을 한 줄 단위로 못 박아 두는 이유는 파싱입니다 — 모델이 머리말이나 번호를
 * 붙이면 그대로 입력칸에 들어가 버립니다.
 */
export type AssistTask = "summary" | "tags" | "titles";

const ASSIST_BASE = `당신은 개인 기술 블로그 「기록실 INDEX.」의 편집을 돕습니다.
- 본문에 없는 내용을 지어내지 마세요.
- 한국어로 씁니다. 과장·감탄·마케팅 어투를 쓰지 않습니다.
- 요청한 형식만 출력하세요. 머리말, 설명, 따옴표, 번호, 마크다운을 붙이지 마세요.`;

const ASSIST_SYSTEM: Record<AssistTask, string> = {
  summary: `${ASSIST_BASE}

목록과 검색 결과에 뜨는 한 줄 요약을 씁니다.
- 한 문장, 80자 이내.
- 글이 무엇을 다루는지 드러나게. "이 글에서는" 같은 머리말 없이 바로 씁니다.`,
  tags: `${ASSIST_BASE}

글에 붙일 태그를 3~6개 고릅니다.
- 쉼표로 구분한 한 줄로만 출력합니다. 예: react, 접근성, toc
- 기술 이름은 원래 표기(영문 소문자)를, 개념은 짧은 한국어 명사를 씁니다.
- 너무 넓은 태그("개발", "프로그래밍")는 피합니다.
- 이미 쓰는 태그 목록이 주어지면, 뜻이 같을 때는 그 표기를 그대로 씁니다.`,
  titles: `${ASSIST_BASE}

제목 후보를 5개 씁니다.
- 한 줄에 하나씩, 5줄만 출력합니다.
- 무엇을 했는지가 드러나되 밋밋하지 않게. 40자 이내.
- 서로 결이 다르게 — 직설형, 질문형, 결과 중심 등을 섞습니다.`,
};

/** 본문이 길면 앞부분만 보냅니다 — 요약·태그·제목은 앞 몇천 자로 충분하고 쿼터는 아껴야 합니다. */
const ASSIST_BODY_LIMIT = 12_000;

export function assistMessages(
  task: AssistTask,
  post: { title: string; summary: string; body: string; knownTags?: string[] },
) {
  const body =
    post.body.length > ASSIST_BODY_LIMIT
      ? `${post.body.slice(0, ASSIST_BODY_LIMIT)}\n\n(… 이하 생략)`
      : post.body;

  const lines = [`제목: ${post.title.trim() || "(없음)"}`];
  if (post.summary.trim() && task !== "summary") lines.push(`요약: ${post.summary.trim()}`);
  if (task === "tags" && post.knownTags?.length) {
    lines.push(`이미 쓰는 태그: ${post.knownTags.join(", ")}`);
  }
  lines.push("", "## 본문", body);

  return { system: ASSIST_SYSTEM[task], input: lines.join("\n") };
}
