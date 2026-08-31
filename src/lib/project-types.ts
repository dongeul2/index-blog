/**
 * 프로젝트·채널 타입.
 *
 * 파일 시스템도 쿠키도 건드리지 않습니다 — 클라이언트 컴포넌트에서도 안전합니다.
 * DB를 읽는 쪽은 `projects.ts`(서버 전용)입니다.
 */

export type ProjectStatus = "active" | "archived";

/** 저장소 연결 상태 — 새 색을 만들지 않고 기존 토큰에 매핑되어 있습니다. */
export type RepoLink = "linked" | "generated" | "unlinked";

export const REPO_LINK_LABEL: Record<RepoLink, string> = {
  linked: "연결됨",
  generated: "자동생성됨",
  unlinked: "연결 안 됨",
};

export const REPO_LINK_BADGE: Record<RepoLink, string> = {
  linked: "badge badge--linked",
  generated: "badge badge--generated",
  unlinked: "badge badge--unlinked",
};

export type PrState = "open" | "merged" | "closed";

export const PR_STATE_LABEL: Record<PrState, string> = {
  open: "열림",
  merged: "머지됨",
  closed: "닫힘",
};

export type Commit = {
  sha: string;
  message: string;
  author: string | null;
  at: string;
  url: string | null;
};

export type PullRequest = {
  number: number;
  title: string;
  state: PrState;
  url: string | null;
  at: string;
};

export type Project = {
  slug: string;
  name: string;
  description: string;
  /** owner/repo. null이면 아직 저장소를 연결하지 않은 상태 */
  repo: string | null;
  status: ProjectStatus;
  linkState: RepoLink;
  branch: string | null;
  language: string | null;
  readme: string | null;
  lastActivity: string | null;
  /** GitHub에서 마지막으로 받아온 시각. null이면 아직 한 번도 안 받음 */
  syncedAt: string | null;
};

export type Channel = {
  id: string;
  name: string;
  handle: string | null;
  url: string | null;
  note: string | null;
};

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** owner/repo */
export const REPO_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
