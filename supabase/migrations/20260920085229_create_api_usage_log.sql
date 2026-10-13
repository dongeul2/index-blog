-- API 사용량 로그.
--
-- YouTube Data API도 Gemini도 "남은 쿼터"를 물어볼 엔드포인트가 없습니다.
-- 호출할 때마다 우리가 직접 남기고 합산하는 것 외에 방법이 없어서 이 테이블이 있습니다.
--
-- 두 provider를 한 테이블에 담되 단위가 달라 컬럼을 나눕니다.
-- YouTube는 유닛, Gemini는 토큰입니다. 해당 없는 쪽은 0입니다 —
-- "이 호출이 소모한 YouTube 유닛은 0" 은 참이고, 합산에서 NULL을 다루지 않아도 됩니다.
create table public.api_usage_log (
  id bigint generated always as identity primary key,

  provider text not null
    check (provider in ('youtube', 'gemini')),

  -- 'search.list' · 'playlistItems.list' · 'videos.list' · 'generateContent'
  operation text not null
    check (length(operation) > 0),

  -- YouTube 전용. 메서드별 고정 유닛(search.list=100, 나머지 1).
  quota_units integer not null default 0
    check (quota_units >= 0),

  -- Gemini 전용. 응답 usageMetadata에서 꺼냅니다.
  prompt_tokens integer not null default 0
    check (prompt_tokens >= 0),
  output_tokens integer not null default 0
    check (output_tokens >= 0),

  -- Gemini 전용. 한도가 모델별로 다르므로 어떤 모델이었는지 남깁니다.
  model text,

  -- 글 생성으로 이어진 호출만 연결됩니다.
  post_id bigint references public.posts(id) on delete set null,

  success boolean not null default true,

  -- 실패 원인. 429를 두 갈래로 갈라야 해서 종류를 남깁니다 —
  -- rate(분당 RPM/TPM, 재시도 가능) 와 daily(일일 RPD, 내일까지 복구 불가)는
  -- 같은 429지만 대응이 정반대입니다.
  error_kind text
    check (error_kind is null or error_kind in ('rate', 'daily', 'auth', 'other')),

  called_at timestamptz not null default now()
);

comment on table public.api_usage_log is
  'YouTube·Gemini 호출 기록. 남은 쿼터를 조회할 방법이 없어 직접 합산하는 원장입니다.';
comment on column public.api_usage_log.quota_units is
  'YouTube 유닛. 실패해도 쿼터는 차감되므로 success=false 행에도 그대로 기록합니다.';
comment on column public.api_usage_log.error_kind is
  'rate=분당 한도(재시도 가능) / daily=일일 한도(PT 자정까지 복구 불가)';

-- 집계는 항상 "provider = X 이고 called_at >= PT 자정" 입니다.
-- 등치 컬럼을 앞에, 범위 컬럼을 뒤에 둔 복합 인덱스 하나가
-- 단일 컬럼 인덱스 두 개보다 이 질의에 낫습니다.
create index api_usage_log_provider_called_at_idx
  on public.api_usage_log (provider, called_at desc);

-- FK 인덱스. 대부분의 행은 post_id가 null이라 부분 인덱스로 작게 유지합니다.
create index api_usage_log_post_id_idx
  on public.api_usage_log (post_id)
  where post_id is not null;

alter table public.api_usage_log enable row level security;

-- 관리자만. 공개 읽기 정책은 만들지 않습니다 —
-- 사용량은 운영 정보이고 공개 화면에서 쓸 일이 없습니다.
-- is_admin()을 select로 감싸는 것은 행마다 호출되지 않게 하기 위함입니다(기존 정책과 동일).
create policy api_usage_log_admin_all
  on public.api_usage_log
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
