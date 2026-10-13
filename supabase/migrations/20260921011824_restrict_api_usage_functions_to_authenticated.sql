-- 집계 함수는 관리자만 부릅니다.
--
-- SECURITY INVOKER(기본값)라 RLS가 이미 걸려서 anon이 불러도 0만 나옵니다.
-- 그래도 실행 권한 자체를 거둡니다 — "막혀 있으니 괜찮다"보다
-- "부를 수 없다"가 한 겹 더 두껍습니다.
revoke execute on function public.pt_day_bounds()              from public, anon;
revoke execute on function public.api_usage_today()            from public, anon;
revoke execute on function public.api_usage_by_model_today()   from public, anon;

grant execute on function public.pt_day_bounds()            to authenticated;
grant execute on function public.api_usage_today()          to authenticated;
grant execute on function public.api_usage_by_model_today() to authenticated;
