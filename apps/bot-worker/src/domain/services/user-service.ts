import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppLocale, ThemeKey, UserProfileSnapshot } from '@yordamchi/shared';
import { FREE_PLAN_LIMITS, startOfMonthIso } from '@yordamchi/shared';
import { AppError } from '../../core/errors/app-error';
import { Logger } from '../../core/logger/logger';
import { assertSupabaseSingle } from '../../lib/supabase-helpers';

interface TelegramActor {
  first_name: string;
  id: number;
  language_code?: string;
  last_name?: string;
  username?: string;
}

export class UserService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly logger: Logger,
  ) {}

  async upsertTelegramUser(actor: TelegramActor, timezone: string) {
    const { data, error } = await this.client.rpc('upsert_telegram_user', {
      p_first_name: actor.first_name,
      p_language_code: (actor.language_code?.slice(0, 2) ?? 'uz') as AppLocale,
      p_last_name: actor.last_name ?? null,
      p_telegram_user_id: actor.id,
      p_timezone: timezone,
      p_username: actor.username ?? null,
    });

    if (error || !data?.[0]?.user_id) {
      throw new AppError('Failed to bootstrap Telegram user', 500, 'USER_UPSERT_FAILED', {
        details: error,
      });
    }

    return data[0].user_id as string;
  }

  async findByTelegramUserId(telegramUserId: number) {
    const response = await this.client
      .from('users')
      .select('id, telegram_user_id, language_code, timezone')
      .eq('telegram_user_id', telegramUserId)
      .single();

    return assertSupabaseSingle(response, 'Failed to find user');
  }

  async getProfileSnapshot(userId: string, timeZone: string): Promise<UserProfileSnapshot> {
    const [userResponse, profileResponse, subscriptionResponse, usageResponse] = await Promise.all([
      this.client
        .from('users')
        .select('id, telegram_user_id, language_code, timezone')
        .eq('id', userId)
        .single(),
      this.client
        .from('user_profiles')
        .select('display_name, role, theme_preference, base_currency')
        .eq('user_id', userId)
        .single(),
      this.client.rpc('subscription_snapshot', {
        p_user_id: userId,
      }),
      this.client
        .from('usage_counters')
        .select('metric, used_count')
        .eq('user_id', userId)
        .eq('usage_month', startOfMonthIso(new Date(), timeZone)),
    ]);

    const user = assertSupabaseSingle(userResponse, 'Failed to load user');
    const profile = assertSupabaseSingle(profileResponse, 'Failed to load profile');
    const subscription = subscriptionResponse.data?.[0] ?? {
      current_period_end: null,
      is_premium: false,
      status: 'inactive',
      tier: 'free',
    };

    if (usageResponse.error) {
      throw new AppError('Failed to load usage counters', 500, 'DATABASE_ERROR', {
        details: usageResponse.error,
      });
    }

    const usage = Object.entries(FREE_PLAN_LIMITS).map(([metric, limit]) => {
      const used = usageResponse.data?.find((entry) => entry.metric === metric)?.used_count ?? 0;
      return {
        limit: subscription.is_premium ? null : limit,
        metric,
        used,
      };
    });

    return {
      baseCurrency: profile.base_currency,
      displayName: profile.display_name,
      locale: user.language_code,
      role: profile.role,
      subscription: {
        currentPeriodEnd: subscription.current_period_end,
        isPremium: subscription.is_premium,
        status: subscription.status,
        tier: subscription.tier,
      },
      telegramUserId: user.telegram_user_id,
      themePreference: profile.theme_preference as ThemeKey,
      timezone: user.timezone ?? timeZone,
      usage,
      userId: user.id,
    };
  }

  async updateProfile(
    userId: string,
    payload: {
      baseCurrency?: 'UZS' | 'USD';
      displayName?: string;
      locale?: AppLocale;
      themePreference?: ThemeKey;
      timezone?: string;
    },
  ) {
    if (payload.locale || payload.timezone) {
      const { error } = await this.client
        .from('users')
        .update({
          language_code: payload.locale,
          timezone: payload.timezone,
        })
        .eq('id', userId);

      if (error) {
        throw new AppError('Failed to update user settings', 500, 'DATABASE_ERROR', { details: error });
      }
    }

    if (payload.displayName || payload.themePreference || payload.baseCurrency) {
      const { error } = await this.client
        .from('user_profiles')
        .update({
          base_currency: payload.baseCurrency,
          display_name: payload.displayName,
          theme_preference: payload.themePreference,
        })
        .eq('user_id', userId);

      if (error) {
        throw new AppError('Failed to update profile', 500, 'DATABASE_ERROR', { details: error });
      }
    }

    this.logger.info('profile_updated', { userId });
  }

  async buildDashboard(userId: string, timeZone: string) {
    const monthStart = startOfMonthIso(new Date(), timeZone);
    const today = new Date().toISOString();

    const [accounts, todayPlans, upcomingPlans, transactions, openDebts] = await Promise.all([
      this.client
        .from('accounts')
        .select('id, name, currency, current_balance, is_default')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('currency'),
      this.client
        .from('plans')
        .select('id, title, due_at, priority, status')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .is('deleted_at', null)
        .gte('due_at', today)
        .order('due_at')
        .limit(3),
      this.client
        .from('plans')
        .select('id, title, due_at, priority, status')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .is('deleted_at', null)
        .gte('due_at', today)
        .order('due_at')
        .limit(10),
      this.client
        .from('transactions')
        .select('direction, original_amount, original_currency, status')
        .eq('user_id', userId)
        .eq('status', 'posted')
        .is('deleted_at', null)
        .gte('occurred_at', `${monthStart}T00:00:00.000Z`),
      this.client
        .from('debts')
        .select('id, counterparty_name, principal_amount, principal_currency, due_at, status, direction')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .in('status', ['open', 'partially_paid', 'overdue'])
        .order('due_at', { ascending: true })
        .limit(5),
    ]);

    if (accounts.error || todayPlans.error || upcomingPlans.error || transactions.error || openDebts.error) {
      throw new AppError('Failed to build dashboard', 500, 'DATABASE_ERROR', {
        accounts: accounts.error,
        debts: openDebts.error,
        plans: upcomingPlans.error,
        todayPlans: todayPlans.error,
        transactions: transactions.error,
      });
    }

    const summary = (transactions.data ?? []).reduce(
      (accumulator, item) => {
        const currency = item.original_currency;
        const direction = item.direction;
        const bucket = accumulator[currency] ?? { expense: 0, income: 0 };
        bucket[direction] += Number(item.original_amount);
        accumulator[currency] = bucket;
        return accumulator;
      },
      {} as Record<string, { expense: number; income: number }>,
    );

    return {
      accounts: accounts.data ?? [],
      monthSummary: summary,
      openDebts: openDebts.data ?? [],
      todayPlans: todayPlans.data ?? [],
      upcomingPlans: upcomingPlans.data ?? [],
    };
  }

  async buildCalendarMonth(userId: string, monthStart: string) {
    const startDate = new Date(`${monthStart}T00:00:00.000Z`);
    const monthEndDate = new Date(startDate);
    monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
    const monthEnd = monthEndDate.toISOString();

    const [plans, reminders, transactions, debts] = await Promise.all([
      this.client
        .from('plans')
        .select('id, title, due_at, status, priority')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('due_at', startDate.toISOString())
        .lt('due_at', monthEnd),
      this.client
        .from('reminders')
        .select('id, scheduled_for, entity_type, status')
        .eq('user_id', userId)
        .gte('scheduled_for', startDate.toISOString())
        .lt('scheduled_for', monthEnd),
      this.client
        .from('transactions')
        .select('id, note, direction, original_amount, original_currency, occurred_at, status')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('occurred_at', startDate.toISOString())
        .lt('occurred_at', monthEnd),
      this.client
        .from('debts')
        .select('id, counterparty_name, due_at, status, principal_amount, principal_currency, direction')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .not('due_at', 'is', null)
        .gte('due_at', startDate.toISOString())
        .lt('due_at', monthEnd),
    ]);

    if (plans.error || reminders.error || transactions.error || debts.error) {
      throw new AppError('Failed to build calendar data', 500, 'DATABASE_ERROR', {
        debts: debts.error,
        plans: plans.error,
        reminders: reminders.error,
        transactions: transactions.error,
      });
    }

    const days = new Map<string, Record<string, unknown>>();

    const ensureDay = (date: string) => {
      if (!days.has(date)) {
        days.set(date, {
          date,
          hasDebtDue: false,
          hasLargeExpense: false,
          hasPlans: false,
          hasReminders: false,
          items: [],
        });
      }

      return days.get(date) as {
        date: string;
        hasDebtDue: boolean;
        hasLargeExpense: boolean;
        hasPlans: boolean;
        hasReminders: boolean;
        items: unknown[];
      };
    };

    for (const plan of plans.data ?? []) {
      const date = String(plan.due_at).slice(0, 10);
      const entry = ensureDay(date);
      entry.hasPlans = true;
      entry.items.push({ kind: 'plan', ...plan });
    }

    for (const reminder of reminders.data ?? []) {
      const date = String(reminder.scheduled_for).slice(0, 10);
      const entry = ensureDay(date);
      entry.hasReminders = true;
      entry.items.push({ kind: 'reminder', ...reminder });
    }

    for (const transaction of transactions.data ?? []) {
      const date = String(transaction.occurred_at).slice(0, 10);
      const entry = ensureDay(date);
      if (transaction.direction === 'expense' && Number(transaction.original_amount) >= 500_000) {
        entry.hasLargeExpense = true;
      }

      entry.items.push({ kind: 'transaction', ...transaction });
    }

    for (const debt of debts.data ?? []) {
      const date = String(debt.due_at).slice(0, 10);
      const entry = ensureDay(date);
      entry.hasDebtDue = true;
      entry.items.push({ kind: 'debt', ...debt });
    }

    return {
      days: Array.from(days.values()).sort((left, right) => String(left.date).localeCompare(String(right.date))),
      monthStart,
    };
  }
}
