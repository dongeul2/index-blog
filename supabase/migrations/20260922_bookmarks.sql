-- 관리자 대시보드 바로가기 위젯.
--
-- "자주 쓰는 도구"로 바로 가는 개인용 링크 모음입니다. 공개 화면에는 두지 않습니다
-- (사용자가 명시적으로 관리자 전용을 골랐습니다) — 그래서 공개 읽기 정책이 없습니다.
create table public.bookmarks (
  id bigint generated always as identity primary key,

  url text not null
    check (url ~ '^https?://'),

  -- 제목은 사람이 직접 입력합니다. 원격 페이지의 <title>을 긁어 오는 방식은
  -- 13번 자막처럼 또 다른 불안정한 외부 의존이 되므로 일부러 쓰지 않았습니다.
  title text not null
    check (length(title) > 0 and length(title) <= 100),

  -- 표시 순서. 기본은 등록순이지만 나중에 바꿀 수 있게 컬럼으로 둡니다.
  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);

comment on table public.bookmarks is
  '관리자 대시보드의 바로가기 위젯. 공개 정책 없음 — 관리자만 보고 씁니다.';

alter table public.bookmarks enable row level security;

-- 관리자만. 공개 읽기 정책은 두지 않습니다 — 이 기능은 관리자 전용으로 결정됐습니다.
create policy bookmarks_admin_all
  on public.bookmarks
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create index bookmarks_sort_order_idx on public.bookmarks (sort_order, created_at);
