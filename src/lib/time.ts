/**
 * 상대 시각.
 *
 * 커밋·PR 목록은 절대 날짜보다 "얼마나 최근인지"가 먼저 읽혀야 해서 상대 시각을 씁니다.
 * 다만 `<time datetime>`에는 항상 정확한 ISO 값을 그대로 두어, 보조기술과 툴팁이
 * 어림값이 아닌 실제 시각을 얻게 합니다.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const sec = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (!Number.isFinite(sec)) return "";
  if (sec < 60) return "방금";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;

  const day = Math.floor(sec / 86400);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;
  if (day < 365) return `${Math.floor(day / 30)}개월 전`;
  return `${Math.floor(day / 365)}년 전`;
}
