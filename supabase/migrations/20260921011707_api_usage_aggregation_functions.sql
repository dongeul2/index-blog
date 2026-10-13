-- 사용량 집계.
--
-- 앱이 아니라 DB에서 집계하는 이유는 둘입니다.
--
-- 1) 날짜 경계. 쿼터는 PT 자정에 리셋되는데 우리는 KST에 있습니다(8~9시간 차이).
--    KST 날짜로 세면 매일 오후 4~5시부터 카운터가 어긋납니다. Postgres는 IANA
--    tzdata 전체를 들고 있어 서머타임까지 정확합니다 — TS에서 오프셋을 손으로
--    계산하면 전환일에 ±1시간 틀어집니다.
-- 2) 합계 하나 구하려고 오늘 치 행을 전부 네트워크로 끌어올 이유가 없습니다.
--
-- 다만 **한도는 돌려주지 않습니다.** 여기서 나오는 건 사실(얼마나 썼나)뿐이고,
-- 한도와 임계값은 앱이 환경변수·ai_models에서 읽어 얹습니다. 한도를 DB에 박으면
-- 수치가 바뀔 때마다 마이그레이션을 돌려야 하고, 그건 하드코딩과 다를 게 없습니다.

/**
 * PT 기준 '오늘'의 경계.
 *
 * 경계 계산을 여기 한 곳에만 둡니다. 두 곳에 두면 언젠가 어긋납니다.
 */
create or replace function public.pt_day_bounds(
  out day_start timestamptz,
  out next_reset timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    -- 벽시계로 옮겨 자정으로 자른 뒤 다시 instant로 되돌립니다.
    date_trunc('day', now() at time zone 'America/Los_Angeles')
      at time zone 'America/Los_Angeles',
    -- 하루를 **벽시계 상태에서** 더합니다. instant에 interval '1 day'를 더하면
    -- 정확히 24시간이 더해져 서머타임 전환일에 1시간 어긋납니다.
    (date_trunc('day', now() at time zone 'America/Los_Angeles') + interval '1 day')
      at time zone 'America/Los_Angeles';
$$;

comment on function public.pt_day_bounds() is
  'PT 자정 기준 오늘의 시작과 다음 리셋 시각. 쿼터 경계 계산의 유일한 정본입니다.';

/**
 * 오늘(PT) 사용량 — 총계.
 *
 * error_kind = 'daily' 인 행은 제외합니다. 한도에 걸려 거절당한 호출은 쿼터를
 * 추가로 쓰지 않습니다. 세어 버리면 막힌 뒤 버튼을 누를수록 "남은 횟수"가
 * 계속 음수로 내려갑니다.
 */
create or replace function public.api_usage_today()
returns table (
  youtube_units bigint,
  youtube_calls bigint,
  gemini_requests bigint,
  gemini_prompt_tokens bigint,
  gemini_output_tokens bigint,
  day_start timestamptz,
  next_reset timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    coalesce(sum(l.quota_units)   filter (where l.provider = 'youtube'), 0),
    count(*)                      filter (where l.provider = 'youtube'),
    count(*)                      filter (where l.provider = 'gemini'),
    coalesce(sum(l.prompt_tokens) filter (where l.provider = 'gemini'), 0),
    coalesce(sum(l.output_tokens) filter (where l.provider = 'gemini'), 0),
    b.day_start,
    b.next_reset
  from public.pt_day_bounds() b
  left join public.api_usage_log l
    on l.called_at >= b.day_start
   and coalesce(l.error_kind, '') <> 'daily'
  group by b.day_start, b.next_reset;
$$;

comment on function public.api_usage_today() is
  '오늘(PT) 소모량. 한도는 돌려주지 않습니다 — 앱이 환경변수에서 읽어 얹습니다.';

/**
 * 오늘(PT) 모델별 Gemini 요청 수.
 *
 * 드롭다운의 「Flash · 12회 남음」이 이 값과 ai_models.daily_requests 로 나옵니다.
 * 한 번도 안 쓴 모델도 0으로 나와야 드롭다운이 완전해지므로 ai_models에서 시작합니다.
 */
create or replace function public.api_usage_by_model_today()
returns table (
  model_id text,
  requests bigint,
  prompt_tokens bigint,
  output_tokens bigint,
  failures bigint
)
language sql
stable
set search_path = ''
as $$
  select
    m.id,
    count(l.id),
    coalesce(sum(l.prompt_tokens), 0),
    coalesce(sum(l.output_tokens), 0),
    count(l.id) filter (where not l.success)
  from public.ai_models m
  left join public.pt_day_bounds() b on true
  left join public.api_usage_log l
    on l.model = m.id
   and l.provider = 'gemini'
   and l.called_at >= b.day_start
   and coalesce(l.error_kind, '') <> 'daily'
  where m.enabled
  group by m.id, m.sort_order
  order by m.sort_order;
$$;

comment on function public.api_usage_by_model_today() is
  '오늘(PT) 모델별 요청 수. 안 쓴 모델도 0으로 나옵니다(드롭다운이 완전해야 하므로).';

-- 집계 함수는 관리자만 부릅니다.
--
-- SECURITY INVOKER(기본값)라 RLS가 이미 걸려서 anon이 불러도 0만 나옵니다.
-- 그래도 실행 권한 자체를 거둡니다 — "막혀 있으니 괜찮다"보다
-- "부를 수 없다"가 한 겹 더 두껍습니다.
revoke execute on function public.pt_day_bounds()            from public, anon;
revoke execute on function public.api_usage_today()          from public, anon;
revoke execute on function public.api_usage_by_model_today() from public, anon;

grant execute on function public.pt_day_bounds()            to authenticated;
grant execute on function public.api_usage_today()          to authenticated;
grant execute on function public.api_usage_by_model_today() to authenticated;
