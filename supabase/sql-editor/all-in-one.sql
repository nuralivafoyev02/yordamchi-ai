-- Yordamchi AI
-- Supabase SQL Editor uchun all-in-one setup
-- Fresh project uchun copy/paste ga tayyor

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_locale') then
    create type app_locale as enum ('uz', 'en', 'ru');
  end if;

  if not exists (select 1 from pg_type where typname = 'currency_code') then
    create type currency_code as enum ('UZS', 'USD');
  end if;

  if not exists (select 1 from pg_type where typname = 'theme_key') then
    create type theme_key as enum ('blue', 'gold');
  end if;

  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('user', 'support', 'admin', 'owner');
  end if;

  if not exists (select 1 from pg_type where typname = 'user_status') then
    create type user_status as enum ('active', 'paused', 'blocked', 'deleted');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_tier') then
    create type subscription_tier as enum ('free', 'premium');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('active', 'inactive', 'expired', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'usage_metric') then
    create type usage_metric as enum ('plan_create', 'finance_entry_create', 'debt_create');
  end if;

  if not exists (select 1 from pg_type where typname = 'account_kind') then
    create type account_kind as enum ('wallet', 'cash', 'card', 'bank');
  end if;

  if not exists (select 1 from pg_type where typname = 'category_kind') then
    create type category_kind as enum ('expense', 'income', 'general');
  end if;

  if not exists (select 1 from pg_type where typname = 'plan_status') then
    create type plan_status as enum ('pending', 'completed', 'cancelled', 'missed');
  end if;

  if not exists (select 1 from pg_type where typname = 'plan_priority') then
    create type plan_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;

  if not exists (select 1 from pg_type where typname = 'repeat_rule') then
    create type repeat_rule as enum ('none', 'daily', 'weekly', 'monthly');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_direction') then
    create type transaction_direction as enum ('income', 'expense');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_kind') then
    create type transaction_kind as enum ('standard', 'debt_disbursement', 'debt_repayment', 'adjustment');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_status') then
    create type transaction_status as enum ('scheduled', 'posted', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'debt_direction') then
    create type debt_direction as enum ('borrowed', 'lent');
  end if;

  if not exists (select 1 from pg_type where typname = 'debt_status') then
    create type debt_status as enum ('open', 'partially_paid', 'paid', 'overdue', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'reminder_kind') then
    create type reminder_kind as enum ('plan_due', 'transaction_due', 'debt_due', 'limit_warning', 'limit_exceeded', 'subscription_expiring', 'generic');
  end if;

  if not exists (select 1 from pg_type where typname = 'reminder_status') then
    create type reminder_status as enum ('pending', 'processing', 'sent', 'failed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type notification_channel as enum ('telegram', 'in_app');
  end if;

  if not exists (select 1 from pg_type where typname = 'log_level') then
    create type log_level as enum ('info', 'warn', 'error', 'audit');
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  auth_user_id uuid unique,
  username text,
  first_name text not null,
  last_name text,
  language_code app_locale not null default 'uz',
  timezone text not null default 'Asia/Tashkent',
  status user_status not null default 'active',
  is_bot_blocked boolean not null default false,
  last_interaction_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  display_name text not null,
  phone_number text,
  phone_verified_at timestamptz,
  role user_role not null default 'user',
  theme_preference theme_key not null default 'blue',
  base_currency currency_code not null default 'UZS',
  secondary_currency currency_code not null default 'USD',
  premium_badge_visible boolean not null default true,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_phone_number_check check (
    phone_number is null or phone_number ~ '^\+[0-9]{7,20}$'
  )
);

create table if not exists public.notification_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  bot_notifications_enabled boolean not null default true,
  plan_reminders_enabled boolean not null default true,
  limit_reminders_enabled boolean not null default true,
  debt_reminders_enabled boolean not null default true,
  subscription_reminders_enabled boolean not null default true,
  quiet_hours_from time,
  quiet_hours_to time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tier subscription_tier not null,
  status subscription_status not null,
  provider text not null default 'manual',
  provider_subscription_id text,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  granted_by_user_id uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_period_check check (
    current_period_end is null or current_period_end >= current_period_start
  )
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  usage_month date not null,
  metric usage_metric not null,
  used_count integer not null default 0,
  limit_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_counters_unique unique (user_id, usage_month, metric),
  constraint usage_counters_month_check check (usage_month = date_trunc('month', usage_month)::date),
  constraint usage_counters_used_count_check check (used_count >= 0),
  constraint usage_counters_limit_count_check check (limit_count is null or limit_count >= 0)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  slug text not null,
  currency currency_code not null,
  kind account_kind not null default 'wallet',
  is_default boolean not null default false,
  is_archived boolean not null default false,
  opening_balance numeric(18,2) not null default 0,
  current_balance numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_unique_slug unique (user_id, slug)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  slug text not null,
  translation_key text,
  kind category_kind not null,
  icon text,
  color_token text not null default 'accent-blue',
  sort_order integer not null default 0,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_system_check check (
    (is_system = true and user_id is null) or (is_system = false and user_id is not null)
  )
);

create table if not exists public.category_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  currency currency_code not null,
  month_start date not null,
  limit_amount numeric(18,2) not null,
  warning_threshold_percent numeric(5,2) not null default 80,
  alert_on_exceed boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_limits_unique unique (user_id, category_id, currency, month_start),
  constraint category_limits_month_check check (month_start = date_trunc('month', month_start)::date),
  constraint category_limits_amount_check check (limit_amount > 0),
  constraint category_limits_threshold_check check (warning_threshold_percent > 0 and warning_threshold_percent <= 100)
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  scheduled_date date not null,
  scheduled_time time,
  due_at timestamptz not null,
  timezone text not null default 'Asia/Tashkent',
  status plan_status not null default 'pending',
  priority plan_priority not null default 'medium',
  repeat_rule repeat_rule not null default 'none',
  reminder_offset_minutes integer not null default 60,
  source_text text,
  source_language app_locale,
  parser_confidence numeric(4,3),
  created_via text not null default 'bot',
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_confidence_check check (parser_confidence is null or (parser_confidence >= 0 and parser_confidence <= 1)),
  constraint plans_reminder_offset_check check (reminder_offset_minutes >= 0 and reminder_offset_minutes <= 10080)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  direction transaction_direction not null,
  kind transaction_kind not null default 'standard',
  status transaction_status not null default 'posted',
  original_amount numeric(18,2) not null,
  original_currency currency_code not null,
  normalized_amount numeric(18,2),
  normalized_currency currency_code,
  exchange_rate numeric(18,6),
  occurred_at timestamptz not null default now(),
  note text,
  source_text text,
  parser_confidence numeric(4,3),
  created_via text not null default 'bot',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_amount_check check (original_amount > 0),
  constraint transactions_exchange_rate_check check (exchange_rate is null or exchange_rate > 0),
  constraint transactions_confidence_check check (parser_confidence is null or (parser_confidence >= 0 and parser_confidence <= 1)),
  constraint transactions_normalized_currency_check check (
    (normalized_amount is null and normalized_currency is null and exchange_rate is null)
    or (normalized_amount is not null and normalized_currency is not null and exchange_rate is not null)
  )
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  counterparty_name text not null,
  direction debt_direction not null,
  principal_amount numeric(18,2) not null,
  principal_currency currency_code not null,
  normalized_amount numeric(18,2),
  normalized_currency currency_code,
  exchange_rate numeric(18,6),
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  status debt_status not null default 'open',
  note text,
  source_text text,
  parser_confidence numeric(4,3),
  created_via text not null default 'bot',
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint debts_amount_check check (principal_amount > 0),
  constraint debts_exchange_rate_check check (exchange_rate is null or exchange_rate > 0),
  constraint debts_confidence_check check (parser_confidence is null or (parser_confidence >= 0 and parser_confidence <= 1)),
  constraint debts_normalized_currency_check check (
    (normalized_amount is null and normalized_currency is null and exchange_rate is null)
    or (normalized_amount is not null and normalized_currency is not null and exchange_rate is not null)
  )
);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(18,2) not null,
  currency currency_code not null,
  paid_at timestamptz not null default now(),
  note text,
  linked_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint debt_payments_amount_check check (amount > 0)
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reminder_kind reminder_kind not null,
  entity_type text not null,
  entity_id uuid,
  channel notification_channel not null default 'telegram',
  scheduled_for timestamptz not null,
  title text not null,
  body text not null,
  action_label text,
  deep_link text,
  status reminder_status not null default 'pending',
  retry_count integer not null default 0,
  max_retry_count integer not null default 5,
  next_retry_at timestamptz,
  lease_owner text,
  lease_expires_at timestamptz,
  sent_at timestamptz,
  last_error text,
  dedupe_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_retry_check check (retry_count >= 0 and max_retry_count >= 0 and retry_count <= max_retry_count)
);

create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency currency_code not null,
  quote_currency currency_code not null,
  rate numeric(18,6) not null,
  rate_date date not null,
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exchange_rates_positive_rate check (rate > 0),
  constraint exchange_rates_no_identity_pair check (base_currency <> quote_currency),
  constraint exchange_rates_unique unique (base_currency, quote_currency, rate_date, source)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  subject_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  level log_level not null default 'audit',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.bot_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  telegram_update_id bigint,
  level log_level not null,
  event text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_states (
  user_id uuid primary key references public.users(id) on delete cascade,
  state_key text not null,
  step_key text not null,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_status_idx on public.users (status);
create index if not exists user_profiles_role_idx on public.user_profiles (role);
create unique index if not exists user_profiles_phone_number_unique_idx on public.user_profiles (phone_number) where phone_number is not null;

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create unique index if not exists subscriptions_one_active_idx
  on public.subscriptions (user_id)
  where status = 'active';

create index if not exists usage_counters_user_month_idx on public.usage_counters (user_id, usage_month desc);

create index if not exists accounts_user_id_idx on public.accounts (user_id);
create unique index if not exists accounts_default_currency_idx
  on public.accounts (user_id, currency)
  where is_default = true and is_archived = false;

create index if not exists categories_user_id_idx on public.categories (user_id);
create unique index if not exists categories_system_slug_idx
  on public.categories (slug, kind)
  where user_id is null;
create unique index if not exists categories_user_slug_idx
  on public.categories (user_id, slug, kind)
  where user_id is not null;

create index if not exists category_limits_user_month_idx on public.category_limits (user_id, month_start desc);
create index if not exists category_limits_category_id_idx on public.category_limits (category_id);

create index if not exists plans_user_due_at_idx on public.plans (user_id, due_at desc);
create index if not exists plans_user_status_due_at_idx on public.plans (user_id, status, due_at);
create index if not exists plans_upcoming_pending_idx
  on public.plans (due_at)
  where deleted_at is null and status = 'pending';

create index if not exists transactions_user_occurred_at_idx on public.transactions (user_id, occurred_at desc);
create index if not exists transactions_account_id_idx on public.transactions (account_id, occurred_at desc);
create index if not exists transactions_category_id_idx on public.transactions (category_id, occurred_at desc);
create index if not exists transactions_user_direction_occurred_idx on public.transactions (user_id, direction, occurred_at desc);
create index if not exists transactions_posted_balance_idx
  on public.transactions (account_id, status, deleted_at)
  where deleted_at is null;

create index if not exists debts_user_status_due_idx on public.debts (user_id, status, due_at);
create index if not exists debts_linked_transaction_idx on public.debts (linked_transaction_id);

create index if not exists debt_payments_debt_id_idx on public.debt_payments (debt_id, paid_at desc);
create index if not exists debt_payments_account_id_idx on public.debt_payments (account_id);

create index if not exists reminders_user_scheduled_idx on public.reminders (user_id, scheduled_for desc);
create index if not exists reminders_dispatch_idx
  on public.reminders (coalesce(next_retry_at, scheduled_for), status)
  where status in ('pending', 'processing');
create index if not exists reminders_entity_idx on public.reminders (entity_type, entity_id);

create index if not exists exchange_rates_pair_date_idx on public.exchange_rates (base_currency, quote_currency, rate_date desc);

create index if not exists audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc);
create index if not exists audit_logs_subject_idx on public.audit_logs (subject_user_id, created_at desc);

create index if not exists bot_logs_user_idx on public.bot_logs (user_id, created_at desc);
create index if not exists bot_logs_level_idx on public.bot_logs (level, created_at desc);

create index if not exists user_states_expires_at_idx on public.user_states (expires_at);

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

alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.notification_settings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.category_limits enable row level security;
alter table public.plans enable row level security;
alter table public.transactions enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.reminders enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.audit_logs enable row level security;
alter table public.bot_logs enable row level security;
alter table public.user_states enable row level security;

alter table public.users force row level security;
alter table public.user_profiles force row level security;
alter table public.notification_settings force row level security;
alter table public.subscriptions force row level security;
alter table public.usage_counters force row level security;
alter table public.accounts force row level security;
alter table public.categories force row level security;
alter table public.category_limits force row level security;
alter table public.plans force row level security;
alter table public.transactions force row level security;
alter table public.debts force row level security;
alter table public.debt_payments force row level security;
alter table public.reminders force row level security;
alter table public.exchange_rates force row level security;
alter table public.audit_logs force row level security;
alter table public.bot_logs force row level security;
alter table public.user_states force row level security;

create policy users_self_select on public.users
for select
to authenticated
using ((select public.current_app_user_id()) = id);

create policy users_self_update on public.users
for update
to authenticated
using ((select public.current_app_user_id()) = id)
with check ((select public.current_app_user_id()) = id);

create policy user_profiles_self_all on public.user_profiles
for all
to authenticated
using ((select public.current_app_user_id()) = user_id)
with check ((select public.current_app_user_id()) = user_id);

create policy notification_settings_self_all on public.notification_settings
for all
to authenticated
using ((select public.current_app_user_id()) = user_id)
with check ((select public.current_app_user_id()) = user_id);

create policy subscriptions_self_select on public.subscriptions
for select
to authenticated
using ((select public.current_app_user_id()) = user_id);

create policy usage_counters_self_select on public.usage_counters
for select
to authenticated
using ((select public.current_app_user_id()) = user_id);

create policy accounts_self_all on public.accounts
for all
to authenticated
using ((select public.current_app_user_id()) = user_id)
with check ((select public.current_app_user_id()) = user_id);

create policy categories_read_own_or_system on public.categories
for select
to authenticated
using (
  user_id is null
  or (select public.current_app_user_id()) = user_id
);

create policy categories_write_own on public.categories
for all
to authenticated
using ((select public.current_app_user_id()) = user_id)
with check ((select public.current_app_user_id()) = user_id and is_system = false);

create policy category_limits_self_all on public.category_limits
for all
to authenticated
using ((select public.current_app_user_id()) = user_id)
with check ((select public.current_app_user_id()) = user_id);

create policy plans_self_all on public.plans
for all
to authenticated
using ((select public.current_app_user_id()) = user_id)
with check ((select public.current_app_user_id()) = user_id);

create policy transactions_self_all on public.transactions
for all
to authenticated
using ((select public.current_app_user_id()) = user_id)
with check ((select public.current_app_user_id()) = user_id);

create policy debts_self_all on public.debts
for all
to authenticated
using ((select public.current_app_user_id()) = user_id)
with check ((select public.current_app_user_id()) = user_id);

create policy debt_payments_self_all on public.debt_payments
for all
to authenticated
using ((select public.current_app_user_id()) = user_id)
with check ((select public.current_app_user_id()) = user_id);

create policy reminders_self_select on public.reminders
for select
to authenticated
using ((select public.current_app_user_id()) = user_id);

create policy exchange_rates_read_authenticated on public.exchange_rates
for select
to authenticated
using (true);

create policy audit_logs_admin_select on public.audit_logs
for select
to authenticated
using ((select public.current_app_user_is_admin()));

create policy bot_logs_admin_select on public.bot_logs
for select
to authenticated
using ((select public.current_app_user_is_admin()));

create policy user_states_self_all on public.user_states
for all
to authenticated
using ((select public.current_app_user_id()) = user_id)
with check ((select public.current_app_user_id()) = user_id);

insert into public.categories (
  name,
  slug,
  translation_key,
  kind,
  icon,
  color_token,
  sort_order,
  is_system
)
values
  ('General', 'general', 'categories.general', 'general', 'grid', 'accent-slate', 1, true),
  ('Salary', 'salary', 'categories.salary', 'income', 'wallet', 'accent-green', 2, true),
  ('Bonus', 'bonus', 'categories.bonus', 'income', 'sparkles', 'accent-green', 3, true),
  ('Gift', 'gift', 'categories.gift', 'income', 'gift', 'accent-green', 4, true),
  ('Food', 'food', 'categories.food', 'expense', 'utensils', 'accent-orange', 10, true),
  ('Transport', 'transport', 'categories.transport', 'expense', 'car', 'accent-blue', 11, true),
  ('Utilities', 'utilities', 'categories.utilities', 'expense', 'bolt', 'accent-yellow', 12, true),
  ('Health', 'health', 'categories.health', 'expense', 'heart-pulse', 'accent-red', 13, true),
  ('Education', 'education', 'categories.education', 'expense', 'graduation-cap', 'accent-indigo', 14, true),
  ('Tax', 'tax', 'categories.tax', 'expense', 'receipt', 'accent-red', 15, true),
  ('Shopping', 'shopping', 'categories.shopping', 'expense', 'shopping-bag', 'accent-pink', 16, true),
  ('Entertainment', 'entertainment', 'categories.entertainment', 'expense', 'film', 'accent-purple', 17, true)
on conflict do nothing;

insert into public.exchange_rates (
  base_currency,
  quote_currency,
  rate,
  rate_date,
  source
)
values
  ('USD', 'UZS', 12650.000000, current_date, 'seed'),
  ('UZS', 'USD', 0.000079, current_date, 'seed')
on conflict do nothing;
