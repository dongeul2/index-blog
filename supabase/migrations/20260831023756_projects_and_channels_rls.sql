-- posts와 같은 형태입니다: 공개는 읽기, 쓰기는 관리자만.
-- 프로젝트·채널에는 "초안" 개념이 없어 모두 공개로 읽힙니다.

alter table public.projects enable row level security;
alter table public.repo_commits enable row level security;
alter table public.repo_pulls enable row level security;
alter table public.channels enable row level security;

create policy projects_public_read on public.projects
  for select to anon, authenticated using (true);
create policy projects_admin_all on public.projects
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy repo_commits_public_read on public.repo_commits
  for select to anon, authenticated using (true);
create policy repo_commits_admin_all on public.repo_commits
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy repo_pulls_public_read on public.repo_pulls
  for select to anon, authenticated using (true);
create policy repo_pulls_admin_all on public.repo_pulls
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy channels_public_read on public.channels
  for select to anon, authenticated using (true);
create policy channels_admin_all on public.channels
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
