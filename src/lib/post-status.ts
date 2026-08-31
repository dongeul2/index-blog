/**
 * 글 상태 — 타입과 라벨.
 *
 * 파일 시스템도 쿠키도 건드리지 않습니다. 에디터(클라이언트 컴포넌트)와 대시보드(서버)가
 * 같은 값을 봐야 해서 따로 뺐습니다 — `admin-posts.ts`는 `next/headers`에 의존하므로
 * 클라이언트에서 import할 수 없습니다.
 */
export type PostStatus = "draft" | "published" | "queued" | "failed";

export const STATUS_ORDER: PostStatus[] = ["draft", "queued", "published", "failed"];

export const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "초안",
  queued: "자동생성 대기",
  published: "발행됨",
  failed: "실패",
};

/** 초안만 점선, 나머지는 기존 색 토큰에 매핑 (디자인 시스템 규칙) */
export const STATUS_BADGE: Record<PostStatus, string> = {
  draft: "badge badge--draft",
  queued: "badge badge--queued",
  published: "badge badge--published",
  failed: "badge badge--failed",
};

export const isStatus = (v: string): v is PostStatus =>
  v === "draft" || v === "published" || v === "queued" || v === "failed";

export function readStatus(v: string | undefined): PostStatus | undefined {
  return v && isStatus(v) ? v : undefined;
}
