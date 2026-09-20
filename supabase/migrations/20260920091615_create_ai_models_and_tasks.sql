-- AI 보조 기능이 쓸 모델 목록과 작업별 기본값.
--
-- 코드가 아니라 DB에 두는 이유: Gemini 모델명은 몇 달 단위로 바뀌고,
-- Google은 모델별 한도 수치를 아예 공개하지 않습니다("AI Studio에서 확인하라").
-- 코드에 박아두면 모델이 은퇴하거나 한도가 조정될 때마다 배포를 다시 해야 합니다.
create table public.ai_models (
  id text primary key,          -- 'gemini-3.8-flash'
  label text not null,          -- 드롭다운에 뜨는 짧은 이름
  description text not null,    -- 속도/품질/쿼터 특성 한 줄

  -- 일일 요청 한도(RPD). null = 아직 확인 안 함 → 화면에 잔여를 표시하지 않습니다.
  -- 모르는 것을 0이나 추정치로 채우면 화면이 거짓말을 합니다.
  daily_requests integer
    check (daily_requests is null or daily_requests > 0),

  enabled boolean not null default true,
  sort_order integer not null default 0
);

comment on table public.ai_models is
  '에디터 드롭다운에 뜨는 Gemini 모델. daily_requests는 AI Studio에서 확인해 직접 채웁니다.';
comment on column public.ai_models.daily_requests is
  'RPD. null이면 한도 미상 — 잔여 표시를 생략합니다(추정치로 채우지 않습니다).';

-- 작업별 기본 모델.
-- ai_models.default_for 배열이 아니라 별도 테이블인 이유는 PK 때문입니다 —
-- "한 작업에 기본 모델은 하나"가 제약으로 보장됩니다. 배열로는 막을 수 없습니다.
create table public.ai_tasks (
  task text primary key
    check (task in ('summary', 'tags', 'titles', 'polish', 'expand')),
  label text not null,
  model_id text not null references public.ai_models(id) on update cascade,
  sort_order integer not null default 0
);

comment on table public.ai_tasks is
  '에디터의 AI 보조 작업과 각각의 기본 모델. 드롭다운은 이 기본값을 덮어쓰는 용도입니다.';

-- FK 인덱스.
create index ai_tasks_model_id_idx on public.ai_tasks (model_id);

alter table public.ai_models enable row level security;
alter table public.ai_tasks  enable row level security;

-- 관리자 전용. 에디터가 관리자 화면이라 공개 읽기가 필요 없습니다.
create policy ai_models_admin_all on public.ai_models
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy ai_tasks_admin_all on public.ai_tasks
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- 씨앗. 실제 API가 돌려준 목록에서 고른 것들입니다.
-- daily_requests는 일부러 비워 둡니다 — AI Studio에서 확인한 값을 직접 넣으세요.
insert into public.ai_models (id, label, description, sort_order) values
  ('gemini-3.8-flash',      'Flash',      '최신 안정판. 품질이 가장 좋습니다. 글을 다듬거나 뼈대를 세울 때.', 10),
  ('gemini-3.5-flash',      'Flash 3.5',  '한 세대 아래. Flash가 막혔을 때 넘어갈 자리입니다.',                20),
  ('gemini-3.5-flash-lite', 'Flash Lite', '가장 빠르고 쿼터가 넉넉합니다. 태그·요약처럼 자주 부르는 작업에.',  30);

insert into public.ai_tasks (task, label, model_id, sort_order) values
  ('summary', '요약문 생성',  'gemini-3.5-flash-lite', 10),
  ('tags',    '태그 제안',    'gemini-3.5-flash-lite', 20),
  ('titles',  '제목 후보',    'gemini-3.8-flash',      30),
  ('polish',  '초안 다듬기',  'gemini-3.8-flash',      40),
  ('expand',  '메모 확장',    'gemini-3.8-flash',      50);
