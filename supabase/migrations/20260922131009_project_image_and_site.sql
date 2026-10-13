-- 프로젝트 커버 이미지 · 사이트 링크(라이브 데모).
--
-- 둘 다 관리자가 직접 URL을 적어 넣는 값입니다. 업로드 파이프라인(Storage)은 없습니다 —
-- 이미 어딘가(GitHub, 스크린샷 호스팅 등)에 있는 이미지를 링크로 참조하는 방식이라,
-- 새 저장소·정책이 필요 없고 기존 `repo_public` 같은 텍스트 URL 컬럼과 같은 결입니다.
--
-- 공개 읽기 정책은 기존 `projects_public_read`(있다면) 또는 그에 준하는 정책이 이미
-- 테이블 전체를 커버합니다 — RLS는 행 단위라 컬럼을 추가해도 정책을 새로 만들 필요가
-- 없습니다.
alter table public.projects
  add column if not exists image_url text
    check (image_url is null or image_url ~ '^https?://'),
  add column if not exists site_url text
    check (site_url is null or site_url ~ '^https?://');

comment on column public.projects.image_url is
  '카드·상세 페이지 커버 이미지. 없으면 이미지 없이(기존 그대로) 렌더링합니다.';
comment on column public.projects.site_url is
  '라이브 데모 등 바로가기 링크. 카드 우상단에 별도 링크로 노출됩니다.';
