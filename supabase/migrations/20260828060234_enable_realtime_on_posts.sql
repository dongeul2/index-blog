-- 10 대시보드는 큐 상태(대기 → 처리중 → 완료/실패)가 바뀌는 것을 실시간으로 보여줍니다.
-- 자동화가 다른 프로세스에서 행을 갱신하므로, 화면을 새로 고치지 않고도 반영되어야 합니다.
--
-- RLS는 realtime에도 그대로 적용됩니다. 관리자만 초안·큐 항목을 받습니다.
alter publication supabase_realtime add table public.posts;
