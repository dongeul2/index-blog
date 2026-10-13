-- 블로그형 에디터(Tiptap)의 문서를 JSON 그대로 둡니다.
-- posts.doc이 있으면 그것이 본문의 정본이고, body에는 검색·읽는 시간·AI 요약용 평문을 함께 저장합니다.
-- doc이 없는 글(AI가 만든 마크다운 요약 등)은 지금처럼 body를 마크다운으로 렌더합니다.
alter table public.posts
  add column doc jsonb check (doc is null or jsonb_typeof(doc) = 'object');

comment on column public.posts.doc is '에디터 문서(Tiptap JSON). 있으면 본문의 정본, body는 평문 사본.';

-- 프로젝트 상세 페이지의 본문(케이스 스터디)
alter table public.projects
  add column story jsonb check (story is null or jsonb_typeof(story) = 'object');

comment on column public.projects.story is '프로젝트 상세 페이지 본문(Tiptap JSON).';
