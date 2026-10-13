-- 프로젝트 랩. 하나의 프로젝트 = 하나의 저장소 + 그에 속한 개발 일지들.
-- repo는 nullable입니다 — 프로젝트를 먼저 만들고 저장소는 나중에 연결할 수 있어야 합니다.
create table public.projects (
  slug          text primary key,
  name          text not null,
  description   text not null default '',
  -- owner/repo. null이면 아직 연결 전
  repo          text,
  status        text not null default 'active',
  link_state    text not null default 'unlinked',
  branch        text,
  language      text,
  -- GitHub에서 받아 캐시합니다(2단계)
  readme        text,
  last_activity timestamptz,
  synced_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint projects_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint projects_status_check
    check (status in ('active', 'archived')),
  constraint projects_link_state_check
    check (link_state in ('linked', 'generated', 'unlinked')),
  -- owner/repo 형식만 받습니다
  constraint projects_repo_format_check
    check (repo is null or repo ~ '^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$'),
  -- 연결됨을 주장하려면 저장소가 있어야 합니다
  constraint projects_linked_needs_repo
    check (link_state = 'unlinked' or repo is not null)
);

comment on table public.projects is
  '프로젝트 랩. repo가 null이면 아직 저장소를 연결하지 않은 상태입니다.';

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function private.set_updated_at();

-- 커밋 — 2단계에서 GitHub API로 채웁니다.
-- jsonb 한 덩어리로 두지 않은 이유: 3단계의 "오늘 작업 요약"이 기간으로 골라야 합니다.
create table public.repo_commits (
  project_slug text not null references public.projects (slug) on delete cascade,
  sha          text not null,
  message      text not null,
  author       text,
  committed_at timestamptz not null,
  url          text,
  primary key (project_slug, sha)
);

-- "이 프로젝트의 최근 커밋" · "오늘 커밋"을 그대로 덮습니다
create index repo_commits_project_time_idx
  on public.repo_commits (project_slug, committed_at desc);

create table public.repo_pulls (
  project_slug text not null references public.projects (slug) on delete cascade,
  number       integer not null,
  title        text not null,
  state        text not null,
  url          text,
  at           timestamptz not null,
  primary key (project_slug, number),
  constraint repo_pulls_state_check check (state in ('open', 'merged', 'closed'))
);

create index repo_pulls_project_time_idx
  on public.repo_pulls (project_slug, at desc);

-- 구독 채널. 영상을 요약할 때 자동으로 쌓입니다(4단계) — 손으로 관리하지 않습니다.
create table public.channels (
  id         text primary key,
  name       text not null,
  handle     text,
  url        text,
  -- 왜 보는지 한 줄. 이것만 손으로 적습니다.
  note       text,
  created_at timestamptz not null default now()
);

comment on table public.channels is
  '구독 채널. 영상을 요약할 때 메타데이터에서 자동 등록됩니다.';
