-- 보안 수정: raw_user_meta_data 는 사용자가 supabase.auth.updateUser({ data: ... }) 로
-- 직접 고칠 수 있습니다. 허용 목록과 대조하는 값으로 쓰면 아무나 자기 user_name 을 바꿔
-- 관리자가 될 수 있습니다.
--
-- auth.identities.identity_data 는 로그인할 때 공급자(GitHub)가 채우는 값이고
-- 사용자가 쓸 수 있는 API가 없습니다. 이쪽을 봅니다.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.identities i
    join public.admins a
      on a.github_login = lower(
           coalesce(
             i.identity_data ->> 'user_name',
             i.identity_data ->> 'preferred_username'
           )
         )
    where i.user_id = (select auth.uid())
      and i.provider = 'github'
  );
$$;

comment on function private.is_admin() is
  '현재 사용자가 관리자 허용 목록에 있는지. 공급자가 채우는 auth.identities 만 봅니다 '
  '— raw_user_meta_data 는 사용자가 고칠 수 있어 인가 판단에 쓰면 안 됩니다.';
