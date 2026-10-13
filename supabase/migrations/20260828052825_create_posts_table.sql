-- 게시물. 기획서(모듈 A)의 프론트매터 키를 그대로 컬럼으로 옮깁니다.
-- 본문은 마크다운 원문으로 보관하고, 렌더링은 앱이 담당합니다.

create schema if not exists private;

create table public.posts (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  title         text not null,
  category      text not null,
  status        text not null default 'draft',
  source        text not null default 'manual',
  source_ref    text,
  project       text,
  channel       text,
  summary       text not null default '',
  tags          text[] not null default '{}',
  body          text not null default '',
  -- source에서 파생됩니다. 따로 적어 두면 두 벌이 되어 어긋납니다.
  is_generated  boolean generated always as (source <> 'manual') stored,
  -- 미래 시각이면 예약 발행입니다.
  published_at  timestamptz,
  author_id     uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint posts_category_check
    check (category in ('devlog', 'video', 'essay')),
  constraint posts_status_check
    check (status in ('draft', 'published', 'queued', 'failed')),
  constraint posts_source_check
    check (source in ('manual', 'youtube-summary', 'slack-claude-code')),
  constraint posts_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- 발행된 글은 발행 시각이 반드시 있어야 정렬과 공개 판정이 가능합니다.
  constraint posts_published_needs_date
    check (status <> 'published' or published_at is not null)
);

comment on table public.posts is
  '게시물. 본문은 마크다운 원문(body)으로 보관합니다.';
comment on column public.posts.source is
  '어디서 왔는지 — manual / youtube-summary / slack-claude-code';
comment on column public.posts.source_ref is
  '유튜브 영상 ID, PR 번호 등 출처 식별자';
comment on column public.posts.published_at is
  '발행 시각. 미래면 예약 발행이라 공개 정책에서 걸러집니다.';

-- 공개 목록의 기본 질의(status + 최신순)를 그대로 덮습니다.
create index posts_status_published_at_idx
  on public.posts (status, published_at desc);

-- 태그 필터는 배열 포함 검사라 GIN이 맞습니다.
create index posts_tags_idx on public.posts using gin (tags);

-- 프로젝트·채널 연결은 값이 있는 행만 조회합니다.
create index posts_project_idx on public.posts (project) where project is not null;
create index posts_channel_idx on public.posts (channel) where channel is not null;

-- updated_at 자동 갱신
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function private.set_updated_at();
