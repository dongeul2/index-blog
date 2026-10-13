-- 포트폴리오 데이터 모델 (#10, #11) — ADR 0004.
--
-- 공개 읽기 테이블입니다. 회사 프로젝트에서 공개하면 안 되는 정보(실제 회사명·내부 링크 등)는
-- 애초에 넣지 않습니다 — RLS는 행 단위라 한 컬럼만 숨길 수 없고, 숨길 값을 DB에 두면 언젠가 샙니다.
-- confidential은 "가렸다"는 표시일 뿐이고, 화면이 저장소·사이트·이미지를 감추고 배지를 답니다.

-- 1. 경력 ------------------------------------------------------------------
create table public.experiences (
  id            bigint generated always as identity primary key,
  -- 화면에 그대로 나가는 이름. 비공개면 '핀테크 스타트업'처럼 적습니다.
  organization  text not null check (length(organization) between 1 and 80),
  title         text not null check (length(title) between 1 and 80),
  period_start  date not null,
  -- null = 재직 중
  period_end    date,
  summary       text not null default '',
  highlights    text[] not null default '{}',
  confidential  boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint experiences_period_check
    check (period_end is null or period_end >= period_start)
);

comment on table public.experiences is
  '경력. 공개 읽기 — 공개하면 안 되는 회사 정보는 넣지 않습니다(confidential은 표시용).';

create trigger experiences_set_updated_at
  before update on public.experiences
  for each row execute function private.set_updated_at();

-- 2. 역량 ------------------------------------------------------------------
-- 숙련도 점수는 두지 않습니다. "어디서 써 봤나"는 project_skills가 말합니다.
create table public.skills (
  slug         text primary key
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null check (length(name) between 1 and 40),
  category     text not null
    check (category in ('frontend', 'backend', 'realtime', 'ai', 'infra', 'qa', 'design', 'process')),
  description  text not null default '',
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

comment on table public.skills is
  '역량 축. 프로젝트·글·데모를 한데 묶는 기준입니다(#12).';

-- 3. 프로젝트 확장 ----------------------------------------------------------
alter table public.projects
  add column kind          text not null default 'personal'
    check (kind in ('personal', 'work')),
  add column experience_id bigint references public.experiences (id) on delete set null,
  add column role          text,
  add column period_start  date,
  add column period_end    date,
  add column team_size     smallint check (team_size is null or team_size > 0),
  -- [{ "label": "빌드 시간", "value": "-62%", "note": "..." }]
  add column metrics       jsonb not null default '[]'
    check (jsonb_typeof(metrics) = 'array'),
  -- [{ "title": "...", "chosen": "...", "alternatives": ["..."], "tradeoff": "..." }]
  add column decisions     jsonb not null default '[]'
    check (jsonb_typeof(decisions) = 'array'),
  add column confidential  boolean not null default false,
  add column featured      boolean not null default false,
  add column sort_order    integer not null default 0,
  add constraint projects_period_check
    check (period_end is null or period_start is null or period_end >= period_start),
  -- 회사 프로젝트만 경력에 속합니다
  add constraint projects_experience_only_work
    check (experience_id is null or kind = 'work');

comment on column public.projects.confidential is
  '사내 기밀 프로젝트 표시. 화면이 저장소·사이트·이미지를 감춥니다. 비밀 값 자체는 넣지 않습니다.';

create index projects_experience_id_idx on public.projects (experience_id)
  where experience_id is not null;
-- 홈의 대표 프로젝트 목록
create index projects_featured_idx on public.projects (sort_order)
  where featured;

-- 4. 프로젝트 ↔ 역량 --------------------------------------------------------
create table public.project_skills (
  project_slug text not null references public.projects (slug) on delete cascade on update cascade,
  skill_slug   text not null references public.skills (slug) on delete cascade on update cascade,
  -- 이 프로젝트에서 그 역량으로 무엇을 했는지 한 줄
  note         text not null default '',
  primary key (project_slug, skill_slug)
);

-- "이 역량을 쓴 프로젝트" (PK의 두 번째 컬럼이라 따로 둡니다)
create index project_skills_skill_idx on public.project_skills (skill_slug);

-- 5. RLS + 권한 ------------------------------------------------------------
-- 기본 권한이 anon에 쓰기까지 열어 두므로, RLS에 더해 권한 자체를 읽기로 좁힙니다(이중 방어).
alter table public.experiences    enable row level security;
alter table public.skills         enable row level security;
alter table public.project_skills enable row level security;

revoke all on public.experiences, public.skills, public.project_skills from anon, authenticated;
grant select on public.experiences, public.skills, public.project_skills to anon, authenticated;
grant insert, update, delete on public.experiences, public.skills, public.project_skills to authenticated;

create policy experiences_public_read on public.experiences
  for select to anon, authenticated using (true);
create policy experiences_admin_all on public.experiences
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy skills_public_read on public.skills
  for select to anon, authenticated using (true);
create policy skills_admin_all on public.skills
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy project_skills_public_read on public.project_skills
  for select to anon, authenticated using (true);
create policy project_skills_admin_all on public.project_skills
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
