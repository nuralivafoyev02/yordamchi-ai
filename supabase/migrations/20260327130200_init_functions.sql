create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
as $$
  select nullif((select auth.jwt() ->> 'app_user_id'), '')::uuid
$$;

create or replace function public.current_app_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where user_id = public.current_app_user_id()
      and role in ('admin', 'owner')
  );
$$;

create or replace function public.transaction_effective_delta(
  p_direction transaction_direction,
  p_status transaction_status,
  p_deleted_at timestamptz,
  p_amount numeric
)
returns numeric
language sql
immutable
as $$
  select case
    when p_status <> 'posted' or p_deleted_at is not null then 0
    when p_direction = 'income' then p_amount
    else -p_amount
  end
$$;

create or replace function public.bootstrap_user_defaults()
returns trigger
language plpgsql
as $$
begin
  insert into public.user_profiles (user_id, display_name)
  values (
    new.id,
    trim(concat_ws(' ', new.first_name, new.last_name))
  )
  on conflict (user_id) do nothing;

  insert into public.notification_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.accounts (user_id, name, slug, currency, is_default)
  values
    (new.id, 'UZS Wallet', 'uzs-wallet', 'UZS', true),
    (new.id, 'USD Wallet', 'usd-wallet', 'USD', true)
  on conflict (user_id, slug) do nothing;

  return new;
end;
$$;

create or replace function public.increment_usage_counter(
  p_user_id uuid,
  p_metric usage_metric,
  p_usage_month date default date_trunc('month', now())::date,
  p_delta integer default 1
)
returns public.usage_counters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_counter public.usage_counters;
begin
  insert into public.usage_counters (
    user_id,
    usage_month,
    metric,
    used_count
  )
  values (
    p_user_id,
    date_trunc('month', p_usage_month)::date,
    p_metric,
    greatest(p_delta, 0)
  )
  on conflict (user_id, usage_month, metric)
  do update set
    used_count = public.usage_counters.used_count + excluded.used_count,
    updated_at = now()
  returning * into v_counter;

  return v_counter;
end;
$$;

create or replace function public.track_usage_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'plans' and new.deleted_at is null then
    perform public.increment_usage_counter(new.user_id, 'plan_create', new.created_at::date, 1);
  elsif tg_table_name = 'transactions' and new.deleted_at is null then
    perform public.increment_usage_counter(new.user_id, 'finance_entry_create', new.created_at::date, 1);
  elsif tg_table_name = 'debts' and new.deleted_at is null then
    perform public.increment_usage_counter(new.user_id, 'debt_create', new.created_at::date, 1);
  end if;

  return new;
end;
$$;

create or replace function public.validate_transaction_integrity()
returns trigger
language plpgsql
as $$
declare
  v_account_currency currency_code;
  v_account_user_id uuid;
  v_category_kind category_kind;
  v_category_user_id uuid;
begin
  select currency, user_id
  into v_account_currency, v_account_user_id
  from public.accounts
  where id = new.account_id;

  if not found then
    raise exception 'Account % not found', new.account_id;
  end if;

  if v_account_user_id <> new.user_id then
    raise exception 'Account does not belong to user';
  end if;

  if v_account_currency <> new.original_currency then
    raise exception 'Account currency % does not match transaction currency %', v_account_currency, new.original_currency;
  end if;

  if new.category_id is not null then
    select kind, user_id
    into v_category_kind, v_category_user_id
    from public.categories
    where id = new.category_id
      and is_active = true;

    if not found then
      raise exception 'Category % not found', new.category_id;
    end if;

    if v_category_user_id is not null and v_category_user_id <> new.user_id then
      raise exception 'Category does not belong to user';
    end if;

    if v_category_kind <> 'general' and v_category_kind::text <> new.direction::text then
      raise exception 'Category kind % is incompatible with transaction direction %', v_category_kind, new.direction;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.apply_transaction_balance_delta()
returns trigger
language plpgsql
as $$
declare
  v_old_delta numeric(18,2) := 0;
  v_new_delta numeric(18,2) := 0;
begin
  if tg_op <> 'INSERT' then
    v_old_delta := public.transaction_effective_delta(old.direction, old.status, old.deleted_at, old.original_amount);
  end if;

  if tg_op <> 'DELETE' then
    v_new_delta := public.transaction_effective_delta(new.direction, new.status, new.deleted_at, new.original_amount);
  end if;

  if tg_op = 'INSERT' then
    update public.accounts
    set current_balance = current_balance + v_new_delta
    where id = new.account_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.accounts
    set current_balance = current_balance - v_old_delta
    where id = old.account_id;
    return old;
  end if;

  if old.account_id = new.account_id then
    update public.accounts
    set current_balance = current_balance - v_old_delta + v_new_delta
    where id = new.account_id;
  else
    update public.accounts
    set current_balance = current_balance - v_old_delta
    where id = old.account_id;

    update public.accounts
    set current_balance = current_balance + v_new_delta
    where id = new.account_id;
  end if;

  return new;
end;
$$;

create or replace function public.validate_debt_payment_integrity()
returns trigger
language plpgsql
as $$
declare
  v_account_currency currency_code;
  v_account_user_id uuid;
  v_debt_currency currency_code;
  v_debt_user_id uuid;
begin
  select currency, user_id
  into v_account_currency, v_account_user_id
  from public.accounts
  where id = new.account_id;

  if not found then
    raise exception 'Account % not found', new.account_id;
  end if;

  select principal_currency, user_id
  into v_debt_currency, v_debt_user_id
  from public.debts
  where id = new.debt_id;

  if not found then
    raise exception 'Debt % not found', new.debt_id;
  end if;

  if v_account_user_id <> new.user_id or v_debt_user_id <> new.user_id then
    raise exception 'Debt payment ownership mismatch';
  end if;

  if v_account_currency <> new.currency or v_debt_currency <> new.currency then
    raise exception 'Debt payment currency must match both account and debt currency';
  end if;

  return new;
end;
$$;

create or replace function public.sync_debt_status()
returns trigger
language plpgsql
as $$
declare
  v_debt_id uuid;
  v_principal numeric(18,2);
  v_due_at timestamptz;
  v_deleted_at timestamptz;
  v_total_paid numeric(18,2);
  v_new_status debt_status;
begin
  v_debt_id := coalesce(new.debt_id, old.debt_id);

  select principal_amount, due_at, deleted_at
  into v_principal, v_due_at, v_deleted_at
  from public.debts
  where id = v_debt_id;

  if not found then
    return coalesce(new, old);
  end if;

  if v_deleted_at is not null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount), 0)
  into v_total_paid
  from public.debt_payments
  where debt_id = v_debt_id;

  if v_total_paid >= v_principal then
    v_new_status := 'paid';
  elsif v_due_at is not null and v_due_at < now() then
    v_new_status := 'overdue';
  elsif v_total_paid > 0 then
    v_new_status := 'partially_paid';
  else
    v_new_status := 'open';
  end if;

  update public.debts
  set status = v_new_status,
      updated_at = now()
  where id = v_debt_id
    and status <> 'cancelled';

  return coalesce(new, old);
end;
$$;

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
    language_code = excluded.language_code,
    timezone = excluded.timezone,
    last_interaction_at = now(),
    updated_at = now()
  returning id, xmax = 0;
end;
$$;

create or replace function public.subscription_snapshot(p_user_id uuid)
returns table (
  tier subscription_tier,
  status subscription_status,
  current_period_end timestamptz,
  is_premium boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with active_subscription as (
    select tier, status, current_period_end
    from public.subscriptions
    where user_id = p_user_id
      and status = 'active'
      and (current_period_end is null or current_period_end > now())
    order by current_period_end desc nulls last
    limit 1
  )
  select
    coalesce((select tier from active_subscription), 'free'::subscription_tier) as tier,
    coalesce((select status from active_subscription), 'inactive'::subscription_status) as status,
    (select current_period_end from active_subscription) as current_period_end,
    coalesce((select tier from active_subscription), 'free'::subscription_tier) = 'premium'::subscription_tier as is_premium;
$$;

create or replace function public.grant_premium_subscription(
  p_target_user_id uuid,
  p_actor_user_id uuid,
  p_months integer default 1,
  p_metadata jsonb default '{}'::jsonb
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription public.subscriptions;
begin
  if p_months <= 0 then
    raise exception 'Grant months must be positive';
  end if;

  update public.subscriptions
  set status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  where user_id = p_target_user_id
    and status = 'active';

  insert into public.subscriptions (
    user_id,
    tier,
    status,
    provider,
    current_period_start,
    current_period_end,
    granted_by_user_id,
    metadata
  )
  values (
    p_target_user_id,
    'premium',
    'active',
    'manual',
    now(),
    now() + make_interval(months => p_months),
    p_actor_user_id,
    p_metadata
  )
  returning * into v_subscription;

  insert into public.audit_logs (
    actor_user_id,
    subject_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_actor_user_id,
    p_target_user_id,
    'grant_premium_subscription',
    'subscription',
    v_subscription.id,
    jsonb_build_object('months', p_months, 'metadata', p_metadata)
  );

  return v_subscription;
end;
$$;

create or replace function public.claim_due_reminders(
  p_batch_size integer default 50,
  p_now timestamptz default now(),
  p_lease_owner text default gen_random_uuid()::text,
  p_lease_seconds integer default 60
)
returns setof public.reminders
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due_rows as (
    select id
    from public.reminders
    where status in ('pending', 'processing')
      and retry_count <= max_retry_count
      and coalesce(next_retry_at, scheduled_for) <= p_now
      and (lease_expires_at is null or lease_expires_at <= p_now)
    order by coalesce(next_retry_at, scheduled_for), created_at
    for update skip locked
    limit greatest(p_batch_size, 1)
  ),
  updated as (
    update public.reminders r
    set status = 'processing',
        lease_owner = p_lease_owner,
        lease_expires_at = p_now + make_interval(secs => greatest(p_lease_seconds, 10)),
        updated_at = now()
    from due_rows
    where r.id = due_rows.id
    returning r.*
  )
  select * from updated;
end;
$$;

create or replace function public.mark_reminder_sent(
  p_reminder_id uuid,
  p_sent_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reminders
  set status = 'sent',
      sent_at = p_sent_at,
      lease_owner = null,
      lease_expires_at = null,
      last_error = null,
      updated_at = now()
  where id = p_reminder_id;
end;
$$;

create or replace function public.mark_reminder_failed(
  p_reminder_id uuid,
  p_error text,
  p_now timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retry_count integer;
  v_max_retry_count integer;
begin
  select retry_count, max_retry_count
  into v_retry_count, v_max_retry_count
  from public.reminders
  where id = p_reminder_id;

  if not found then
    return;
  end if;

  update public.reminders
  set retry_count = retry_count + 1,
      status = case when retry_count + 1 >= max_retry_count then 'failed' else 'pending' end,
      next_retry_at = case
        when retry_count + 1 >= max_retry_count then null
        else p_now + make_interval(mins => least(power(2, retry_count)::int, 60))
      end,
      lease_owner = null,
      lease_expires_at = null,
      last_error = left(p_error, 1000),
      updated_at = now()
  where id = p_reminder_id;
end;
$$;

create or replace trigger users_bootstrap_defaults_trigger
after insert on public.users
for each row
execute function public.bootstrap_user_defaults();

create or replace trigger users_updated_at_trigger
before update on public.users
for each row
execute function public.set_updated_at();

create or replace trigger user_profiles_updated_at_trigger
before update on public.user_profiles
for each row
execute function public.set_updated_at();

create or replace trigger notification_settings_updated_at_trigger
before update on public.notification_settings
for each row
execute function public.set_updated_at();

create or replace trigger subscriptions_updated_at_trigger
before update on public.subscriptions
for each row
execute function public.set_updated_at();

create or replace trigger usage_counters_updated_at_trigger
before update on public.usage_counters
for each row
execute function public.set_updated_at();

create or replace trigger accounts_updated_at_trigger
before update on public.accounts
for each row
execute function public.set_updated_at();

create or replace trigger categories_updated_at_trigger
before update on public.categories
for each row
execute function public.set_updated_at();

create or replace trigger category_limits_updated_at_trigger
before update on public.category_limits
for each row
execute function public.set_updated_at();

create or replace trigger plans_updated_at_trigger
before update on public.plans
for each row
execute function public.set_updated_at();

create or replace trigger transactions_updated_at_trigger
before update on public.transactions
for each row
execute function public.set_updated_at();

create or replace trigger transactions_validate_trigger
before insert or update on public.transactions
for each row
execute function public.validate_transaction_integrity();

create or replace trigger transactions_balance_trigger
after insert or update or delete on public.transactions
for each row
execute function public.apply_transaction_balance_delta();

create or replace trigger debts_updated_at_trigger
before update on public.debts
for each row
execute function public.set_updated_at();

create or replace trigger debt_payments_updated_at_trigger
before update on public.debt_payments
for each row
execute function public.set_updated_at();

create or replace trigger debt_payments_validate_trigger
before insert or update on public.debt_payments
for each row
execute function public.validate_debt_payment_integrity();

create or replace trigger debt_payments_sync_debt_status_trigger
after insert or update or delete on public.debt_payments
for each row
execute function public.sync_debt_status();

create or replace trigger reminders_updated_at_trigger
before update on public.reminders
for each row
execute function public.set_updated_at();

create or replace trigger exchange_rates_updated_at_trigger
before update on public.exchange_rates
for each row
execute function public.set_updated_at();

create or replace trigger user_states_updated_at_trigger
before update on public.user_states
for each row
execute function public.set_updated_at();

create or replace trigger plans_usage_tracking_trigger
after insert on public.plans
for each row
execute function public.track_usage_counter();

create or replace trigger transactions_usage_tracking_trigger
after insert on public.transactions
for each row
execute function public.track_usage_counter();

create or replace trigger debts_usage_tracking_trigger
after insert on public.debts
for each row
execute function public.track_usage_counter();
