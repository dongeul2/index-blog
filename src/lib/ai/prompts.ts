import type { SummaryRequest } from "./shared";

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
