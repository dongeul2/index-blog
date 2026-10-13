-- 단일 사용자 제약.
-- GitHub OAuth는 아무 계정이나 로그인할 수 있으므로, 허용된 GitHub 계정만 관리자로 인정합니다.
create table public.admins (
  github_login text primary key,
  note         text,
  created_at   timestamptz not null default now()
);

comment on table public.admins is
  '관리자로 인정할 GitHub 로그인 허용 목록. 소문자로 저장합니다.';

alter table public.admins enable row level security;
-- 정책을 하나도 두지 않습니다 = anon/authenticated는 읽지도 쓰지도 못합니다.
-- 목록 관리는 대시보드나 service_role로만 합니다.

-- 현재 로그인한 사용자가 허용 목록에 있는지.
-- security definer라 auth.users와 admins를 읽을 수 있지만, 언제나 auth.uid()로
-- "호출한 본인"만 검사하므로 다른 사람 정보를 알아낼 수 없습니다.
-- (사용자가 고칠 수 있는 raw_user_meta_data를 보던 첫 판 — 다음 마이그레이션에서 바로잡습니다)
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.admins a
      on a.github_login = lower(u.raw_user_meta_data ->> 'user_name')
    where u.id = (select auth.uid())
  );
$$;

revoke execute on function private.is_admin() from public, anon;
-- 정책 표현식은 질의한 롤의 권한으로 평가되므로 authenticated에는 남겨 둡니다.
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.posts enable row level security;

-- 공개: 발행되었고 발행 시각이 지난 글만. 예약 발행은 시각이 될 때까지 보이지 않습니다.
create policy posts_public_read on public.posts
  for select
  to anon, authenticated
  using (status = 'published' and published_at <= now());

-- 관리자: 전체. 함수는 select로 감싸 행마다 재평가되지 않게 합니다.
create policy posts_admin_all on public.posts
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
