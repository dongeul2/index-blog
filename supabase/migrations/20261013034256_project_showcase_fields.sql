-- 프로젝트 쇼케이스: 소개 글 · 프로젝트별 강조색 · 이미지 갤러리.
-- 커버 이미지는 저장소의 public/ 경로(/projects/...)도 받습니다 — 외부 호스팅 없이 PR로 이미지를 올리기 위해.
alter table public.projects
  add column overview  text not null default '',
  add column accent    text check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$'),
  add column image_alt text,
  -- [{ "src": "/projects/x/1.png", "alt": "...", "caption": "..." }]
  add column gallery   jsonb not null default '[]' check (jsonb_typeof(gallery) = 'array');

comment on column public.projects.overview is '홈 쇼케이스의 소개 글(2~4문장).';
comment on column public.projects.accent is '프로젝트 고유 강조색 #RRGGBB. 커버 프레임·수치에 씁니다.';

alter table public.projects drop constraint if exists projects_image_url_check;
alter table public.projects add constraint projects_image_url_check
  check (image_url is null or image_url ~ '^(https?://|/)');
