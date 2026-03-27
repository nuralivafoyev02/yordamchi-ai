create or replace function public.upsert_telegram_user(
  p_telegram_user_id bigint,
  p_first_name text,
  p_last_name text default null,
  p_username text default null,
  p_language_code app_locale default 'uz',
  p_timezone text default 'Asia/Tashkent'
)
returns table (user_id uuid, is_new boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into public.users (
    telegram_user_id,
    first_name,
    last_name,
    username,
    language_code,
    timezone,
    last_interaction_at
  )
  values (
    p_telegram_user_id,
    p_first_name,
    p_last_name,
    p_username,
    coalesce(p_language_code, 'uz'),
    coalesce(p_timezone, 'Asia/Tashkent'),
    now()
  )
  on conflict (telegram_user_id)
  do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    username = excluded.username,
    language_code = coalesce(public.users.language_code, excluded.language_code, 'uz'::app_locale),
    timezone = coalesce(public.users.timezone, excluded.timezone, 'Asia/Tashkent'),
    last_interaction_at = now(),
    updated_at = now()
  returning id, xmax = 0;
end;
$$;
