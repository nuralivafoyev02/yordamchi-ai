alter table public.user_profiles
add column if not exists phone_number text,
add column if not exists phone_verified_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_phone_number_check'
  ) then
    alter table public.user_profiles
    add constraint user_profiles_phone_number_check
    check (phone_number is null or phone_number ~ '^\+[0-9]{7,20}$');
  end if;
end
$$;

create unique index if not exists user_profiles_phone_number_unique_idx
on public.user_profiles (phone_number)
where phone_number is not null;
