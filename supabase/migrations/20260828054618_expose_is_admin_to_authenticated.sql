-- 앱이 "나는 관리자인가"를 물을 수 있어야 관리자 화면을 가릴 수 있습니다.
-- private.is_admin() 은 PostgREST에 노출되지 않는 스키마에 있으므로 얇은 래퍼를 둡니다.
--
-- SECURITY INVOKER 입니다 — 호출한 사람의 권한으로 돌기 때문에, 이 함수가 새로운 권한을
-- 만들어 주지 않습니다. anon 은 private.is_admin() 실행 권한이 없어 애초에 부를 수 없습니다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin();
$$;

comment on function public.is_admin() is
  '현재 로그인한 사용자가 관리자인지. 자기 자신에 대한 답만 돌려줍니다.';

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
