import type { RichDoc } from "./rich";

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

/** `<Badge variant>` 로 그대로 넘깁니다 — 클래스 문자열을 손으로 잇지 않습니다. */
export const REPO_LINK_BADGE = {
  linked: "linked",
  generated: "generated",
  unlinked: "unlinked",
} as const satisfies Record<RepoLink, RepoLink>;

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
  /** README·커밋·PR을 공개 화면에 보일지. 비공개 저장소를 연결했을 때의 안전장치입니다. */
  repoPublic: boolean;
  lastActivity: string | null;
  /** GitHub에서 마지막으로 받아온 시각. null이면 아직 한 번도 안 받음 */
  syncedAt: string | null;
  /** 카드·상세 페이지 커버 이미지. 관리자가 직접 URL을 적어 넣습니다(업로드 없음) */
  imageUrl: string | null;
  /** 라이브 데모 등 바로가기 링크 */
  siteUrl: string | null;

  /* ---- 포트폴리오 (20261013030247) ---- */
  kind: ProjectKind;
  experienceId: number | null;
  /** 이 프로젝트에서 맡은 일 */
  role: string | null;
  /** YYYY-MM-DD */
  periodStart: string | null;
  periodEnd: string | null;
  teamSize: number | null;
  metrics: Metric[];
  decisions: Decision[];
  /** 사내 기밀 — 저장소·사이트·이미지를 감춥니다 */
  confidential: boolean;
  featured: boolean;
  sortOrder: number;
  /** 쇼케이스 소개 글(2~4문장) */
  overview: string;
  /** 프로젝트 고유 강조색 #RRGGBB */
  accent: string | null;
  imageAlt: string | null;
  gallery: GalleryImage[];
  /** 상세 페이지 본문(에디터 문서) */
  story: RichDoc | null;
};

export type GalleryImage = { src: string; alt: string; caption?: string };

export type ProjectKind = "personal" | "work";

export const PROJECT_KIND_LABEL: Record<ProjectKind, string> = {
  personal: "개인",
  work: "회사",
};

export type Metric = { label: string; value: string; note?: string };

export type Decision = {
  title: string;
  chosen?: string;
  alternatives?: string[];
  tradeoff?: string;
};

export type Experience = {
  id: number;
  organization: string;
  title: string;
  periodStart: string;
  /** null = 재직 중 */
  periodEnd: string | null;
  summary: string;
  highlights: string[];
  confidential: boolean;
};

export type SkillCategory =
  | "frontend"
  | "backend"
  | "realtime"
  | "ai"
  | "infra"
  | "qa"
  | "design"
  | "process";

/** 범례 순서 — 프론트엔드 포트폴리오라 프론트엔드가 맨 앞입니다 */
export const SKILL_CATEGORIES: SkillCategory[] = [
  "frontend",
  "realtime",
  "ai",
  "qa",
  "design",
  "backend",
  "infra",
  "process",
];

export const SKILL_CATEGORY_LABEL: Record<SkillCategory, string> = {
  frontend: "프론트엔드",
  backend: "백엔드",
  realtime: "실시간",
  ai: "AI",
  infra: "인프라",
  qa: "품질",
  design: "디자인",
  process: "협업·프로세스",
};

export type Skill = {
  slug: string;
  name: string;
  category: SkillCategory;
  description: string;
};

/** 프로젝트에서 그 역량으로 한 일 */
export type ProjectSkill = { projectSlug: string; skillSlug: string; note: string };

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

/** 홈 첫 화면·소개의 인적 사항(profile 테이블, 한 행). 빈 값은 화면에서 빠집니다 */
export type Profile = {
  name: string;
  /** 히어로에서 선으로 그리는 이름. 비면 name */
  nameLatin: string;
  /** 하는 일 한 줄 — 직무 하나로 못 박지 않습니다 */
  tagline: string;
  intro: string;
  birth: string;
  location: string;
  education: string;
  email: string;
  github: string;
};

export const EMPTY_PROFILE: Profile = {
  name: "",
  nameLatin: "",
  tagline: "",
  intro: "",
  birth: "",
  location: "",
  education: "",
  email: "",
  github: "",
};
