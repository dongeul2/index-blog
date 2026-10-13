-- 홈에서 바로 편집 — 인적 사항을 DB로, 이미지·첨부 파일을 Storage로.

-- 1. 인적 사항: 한 행만 존재합니다(id = 1)
create table public.profile (
  id          smallint primary key default 1 check (id = 1),
  name        text not null default '',
  -- 히어로에서 선으로 그리는 이름. 비우면 name을 씁니다
  name_latin  text not null default '',
  -- 직무 한 줄. 하나로 정하지 않고 하는 일을 나열해도 됩니다
  tagline     text not null default '',
  intro       text not null default '',
  birth       text not null default '',
  location    text not null default '',
  education   text not null default '',
  email       text not null default '',
  github      text not null default '',
  updated_at  timestamptz not null default now()
);

comment on table public.profile is '홈 첫 화면과 소개의 인적 사항. 공개 읽기 — 공개하지 않을 값은 비워 둡니다.';

create trigger profile_set_updated_at
  before update on public.profile
  for each row execute function private.set_updated_at();

alter table public.profile enable row level security;
revoke all on public.profile from anon, authenticated;
grant select on public.profile to anon, authenticated;
grant insert, update on public.profile to authenticated;

create policy profile_public_read on public.profile
  for select to anon, authenticated using (true);
create policy profile_admin_write on public.profile
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

insert into public.profile (id, tagline, intro, github)
values (1, '기획 · 개발 · QA · 운영',
        '문제를 정의하는 기획부터 화면과 데이터를 만들고, 테스트로 지키고, 배포 뒤까지 돌봅니다.',
        'dongeul2');

-- 2. 미디어: 공개 버킷(내려받기는 누구나), 올리기·지우기는 관리자만.
--    목록 조회(select)도 관리자만 — 공개 버킷이어도 파일 목록은 감춥니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 10485760,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
    'application/pdf', 'application/zip', 'text/plain', 'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
);

create policy media_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select private.is_admin()));
create policy media_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select private.is_admin()));
create policy media_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select private.is_admin()));
