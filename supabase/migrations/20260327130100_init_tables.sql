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
  role user_role not null default 'user',
  theme_preference theme_key not null default 'blue',
  base_currency currency_code not null default 'UZS',
  secondary_currency currency_code not null default 'USD',
  premium_badge_visible boolean not null default true,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
