import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { hasApiKey, streamGenerate, type SummaryRequest } from "@/lib/ai/provider";
import { devlogMessages } from "@/lib/ai/prompts";

/**
 * 개발 일지 초안 — 스트리밍.
 *
 * 서버 액션이 아니라 라우트 핸들러인 이유는 스트리밍입니다. 초안 한 편은 수십 초가 걸리는데
 * 그동안 화면이 멈춰 있으면 안 됩니다(디자인 시스템의 `streaming-caret`이 이걸 전제합니다).
 *
 * 레이아웃은 라우트 핸들러에 적용되지 않으므로 여기서 직접 관리자 여부를 확인합니다.
 *
 * 모델 선택·사용량 기록·429 분류는 전부 어댑터(`lib/ai/provider.ts`) 안에서 일어납니다.
 * 여기서는 누가 부르는지만 지킵니다.
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) {
    return NextResponse.json({ error: "관리자만 실행할 수 있습니다." }, { status: 403 });
  }
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY 가 .env.local 에 없습니다." },
      { status: 400 },
    );
  }

  const body = (await request.json()) as SummaryRequest;
  if (!body.commits?.length) {
    return NextResponse.json({ error: "요약할 커밋이 없습니다." }, { status: 400 });
  }

  const { system, input } = devlogMessages(body);

  // 커밋을 묶어 글의 뼈대를 세우는 일이라 'expand'(메모 확장)입니다.
  const stream = await streamGenerate({
    task: "expand",
    model: body.model,
    system,
    input,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
