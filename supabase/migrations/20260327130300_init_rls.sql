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
