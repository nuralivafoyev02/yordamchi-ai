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
