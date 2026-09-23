/**
 * 영상 길이 포맷 — 순수 함수만. `server-only`가 없어 클라이언트 컴포넌트에서도 씁니다.
 * `videos.ts`(서버 전용, DB·API 호출 포함)에서 갈라낸 이유가 그것입니다 —
 * `project-types.ts`를 `projects.ts`에서 갈라낸 것과 같은 이유입니다.
 */

/** 초 → `18:42` / `1:02:03` */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** 보조기술에는 어림값이 아니라 말로 읽어 줍니다. */
export function spokenDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h > 0 ? `${h}시간` : "", m > 0 ? `${m}분` : "", `${s}초`].filter(Boolean).join(" ");
}
