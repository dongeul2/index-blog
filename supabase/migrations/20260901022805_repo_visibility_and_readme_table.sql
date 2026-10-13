-- 비공개 저장소를 연결하면 README·커밋 메시지가 공개 페이지로 새어 나갑니다.
-- 프로젝트마다 "저장소 내용을 공개할지"를 정할 수 있게 합니다. 기본값은 비공개입니다.
alter table public.projects
  add column repo_public boolean not null default false;

comment on column public.projects.repo_public is
  'README·커밋·PR을 공개 화면에 보일지. false면 관리자에게만 보입니다.';

-- README를 별도 테이블로 옮깁니다.
-- RLS는 행 단위라 projects의 한 컬럼만 가릴 수 없습니다. 커밋·PR과 같은 모양으로 두면
-- 같은 정책 하나로 셋을 함께 가릴 수 있습니다.
create table public.repo_readmes (
  project_slug text primary key references public.projects (slug) on delete cascade,
  content      text not null,
  fetched_at   timestamptz not null default now()
);

insert into public.repo_readmes (project_slug, content)
select slug, readme from public.projects where readme is not null;

alter table public.projects drop column readme;

alter table public.repo_readmes enable row level security;

-- 공개 정책을 repo_public에 묶습니다. 관리자 정책은 그대로라 관리자는 언제나 봅니다.
drop policy repo_commits_public_read on public.repo_commits;
drop policy repo_pulls_public_read on public.repo_pulls;

create policy repo_commits_public_read on public.repo_commits
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.slug = repo_commits.project_slug and p.repo_public
    )
  );

create policy repo_pulls_public_read on public.repo_pulls
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.slug = repo_pulls.project_slug and p.repo_public
    )
  );

create policy repo_readmes_public_read on public.repo_readmes
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.slug = repo_readmes.project_slug and p.repo_public
    )
  );

create policy repo_readmes_admin_all on public.repo_readmes
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
