import "server-only";

/**
 * 영상 자막 텍스트 — 비공식 경로.
 *
 * YouTube Data API는 임의 채널의 자막 "텍스트"를 주지 않습니다. `captions.download`가
 * 유일한 다운로드 경로인데 업로더 본인의 OAuth가 있어야 합니다 — 구독 채널(남의 채널)의
 * 자막은 그 방법으로 못 받습니다. 그래서 시청 페이지가 브라우저에서 그대로 받는
 * `timedtext` 엔드포인트를 개인 시청 기록용으로 그대로 부릅니다. API 키도 쿼터도
 * 필요 없지만, **비공식이라 언제든 형식이 바뀌거나 막힐 수 있습니다.**
 *
 * 실패는 항상 조용히 보고합니다(never throw) — "자막이 아예 없음"과 "일시적으로
 * 못 받음"을 화면에서 구분할 이유가 없어 하나로 묶습니다. 13 화면의 "자막 없음"
 * 실패 문구가 이 결과를 그대로 씁니다.
 */

type Track = { langCode: string; name: string; kind: "asr" | null };

const TIMEDTEXT = "https://www.youtube.com/api/timedtext";

/** 목록 XML에서 track 요소만 뽑습니다. 이 정도 구조에는 정규식으로 충분합니다. */
function parseTrackList(xml: string): Track[] {
  const tracks: Track[] = [];
  const re = /<track\b([^>]*)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const attr = (name: string) => attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";
    const langCode = attr("lang_code");
    if (!langCode) continue;
    tracks.push({ langCode, name: attr("name"), kind: attr("kind") === "asr" ? "asr" : null });
  }
  return tracks;
}

/** 한국어 우선, 그다음 영어, 그다음 아무거나. 자동 생성보다 사람이 단 자막을 우선합니다. */
function pickTrack(tracks: Track[]): Track | null {
  const rank = (t: Track) => {
    const lang = t.langCode.startsWith("ko") ? 0 : t.langCode.startsWith("en") ? 1 : 2;
    return lang * 2 + (t.kind === "asr" ? 1 : 0);
  };
  return tracks.slice().sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

const decodeEntities = (s: string) => s.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);

/** transcript XML의 `<text>` 줄들을 이어 붙입니다. 타임스탬프는 버립니다 — 요약에는 필요 없습니다. */
function parseTranscriptXml(xml: string): string {
  const lines: string[] = [];
  const re = /<text\b[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, "")).trim();
    if (text) lines.push(text);
  }
  return lines.join(" ");
}

export type TranscriptResult =
  | { ok: true; text: string; lang: string; auto: boolean; truncated: boolean }
  | { ok: false };

/** 프롬프트에 실을 상한. Gemini 컨텍스트를 넉넉히 남기려고 여기서 자릅니다. */
const MAX_CHARS = 4_000;

export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  try {
    const listRes = await fetch(`${TIMEDTEXT}?type=list&v=${encodeURIComponent(videoId)}`, {
      cache: "no-store",
    });
    if (!listRes.ok) return { ok: false };

    const track = pickTrack(parseTrackList(await listRes.text()));
    if (!track) return { ok: false };

    const params = new URLSearchParams({ v: videoId, lang: track.langCode });
    if (track.name) params.set("name", track.name);
    if (track.kind === "asr") params.set("kind", "asr");

    const textRes = await fetch(`${TIMEDTEXT}?${params}`, { cache: "no-store" });
    if (!textRes.ok) return { ok: false };

    const text = parseTranscriptXml(await textRes.text());
    if (!text) return { ok: false };

    const truncated = text.length > MAX_CHARS;
    return {
      ok: true,
      text: truncated ? `${text.slice(0, MAX_CHARS)}…` : text,
      lang: track.langCode,
      auto: track.kind === "asr",
      truncated,
    };
  } catch {
    return { ok: false };
  }
}
