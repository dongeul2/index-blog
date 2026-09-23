import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { hasApiKey, streamGenerate, type VideoSummaryRequest } from "@/lib/ai/provider";
import { videoSummaryMessages } from "@/lib/ai/prompts";
import { fetchTranscript } from "@/lib/transcript";

/**
 * 영상 요약 초안 — 스트리밍.
 *
 * `/api/summarize`(개발 일지)와 같은 이유로 라우트 핸들러입니다 — 초안 한 편은
 * 수십 초가 걸리고 그동안 화면이 멈춰 있으면 안 됩니다.
 *
 * **자막을 못 받으면 설명(description)으로 대신합니다.** `lib/transcript.ts`는
 * 비공식 경로라 서버 환경(특히 클라우드 호스팅의 데이터센터 IP)에서는 YouTube가
 * 자주 막습니다 — 그렇다고 "자막 없음"으로 항상 막으면 이 화면이 거의 항상 실패합니다.
 * 설명마저 비어 있을 때만 진짜로 자료가 없는 것이므로 그때만 422로 끝냅니다.
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

  const body = (await request.json()) as VideoSummaryRequest;
  if (!body.videoId) {
    return NextResponse.json({ error: "videoId가 없습니다." }, { status: 400 });
  }

  const transcript = await fetchTranscript(body.videoId);
  const description = body.description?.trim() ?? "";

  const source = transcript.ok
    ? ({ kind: "transcript", text: transcript.text } as const)
    : description
      ? ({ kind: "description", text: description } as const)
      : null;

  if (!source) {
    return NextResponse.json(
      {
        error:
          "이 영상에서 자막도 설명도 받지 못했습니다. 자막이 없거나 비공개일 수 있습니다.",
        kind: "no_caption",
      },
      { status: 422 },
    );
  }

  const { system, input } = videoSummaryMessages(body, source);

  const stream = await streamGenerate({
    task: "summary",
    model: body.model,
    system,
    input,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // 클라이언트가 실제로 무엇을 근거로 썼는지 알 수 있게 — 자막 대신 설명으로
      // 갔을 때 결과 화면에 조용히 알려 주는 데 씁니다.
      "X-Summary-Source": source.kind,
    },
  });
}
