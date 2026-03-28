import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AppLocale,
  CategorySnapshot,
  CurrencyCode,
  DashboardSnapshot,
  NotificationSettingsSnapshot,
  ThemeKey,
  TransactionDirection,
  UsageCounterSnapshot,
  UsageMetric,
  UserProfileSnapshot,
} from '@yordamchi/shared';
import { FREE_PLAN_LIMITS, locales, startOfMonthIso } from '@yordamchi/shared';
import { AppError } from '../../core/errors/app-error';
import { parseAdminTelegramIds, type EnvBindings } from '../../core/config/env';
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
  private readonly adminTelegramIds: Set<number>;

  constructor(
    private readonly client: SupabaseClient,
    private readonly logger: Logger,
    env: Pick<EnvBindings, 'ADMIN_IDS' | 'ADMIN_TELEGRAM_IDS'>,
  ) {
    this.adminTelegramIds = parseAdminTelegramIds(env);
  }

  private resolveAppLocale(value?: string | null): AppLocale | null {
    const normalized = value?.slice(0, 2);
    return locales.includes(normalized as AppLocale) ? (normalized as AppLocale) : null;
  }

  async upsertTelegramUser(actor: TelegramActor, timezone: string) {
    const existingUserResponse = await this.client
      .from('users')
      .select('language_code, timezone')
      .eq('telegram_user_id', actor.id)
      .maybeSingle();

    if (existingUserResponse.error) {
      throw new AppError('Failed to load Telegram user locale', 500, 'DATABASE_ERROR', {
        details: existingUserResponse.error,
      });
    }

    const existingLocale = this.resolveAppLocale(existingUserResponse.data?.language_code);
    const actorLocale = this.resolveAppLocale(actor.language_code);
    const existingTimezone = typeof existingUserResponse.data?.timezone === 'string' && existingUserResponse.data.timezone.length > 0
      ? existingUserResponse.data.timezone
      : null;

    const { data, error } = await this.client.rpc('upsert_telegram_user', {
      p_first_name: actor.first_name,
      p_language_code: existingLocale ?? actorLocale ?? 'uz',
      p_last_name: actor.last_name ?? null,
      p_telegram_user_id: actor.id,
      p_timezone: existingTimezone ?? timezone,
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
      .select('id, telegram_user_id, username, language_code, timezone')
      .eq('telegram_user_id', telegramUserId)
      .single();

    return assertSupabaseSingle(response, 'Failed to find user');
  }

  async getProfileSnapshot(userId: string, timeZone: string): Promise<UserProfileSnapshot> {
    const [userResponse, profileResponse, subscriptionResponse, usageResponse] = await Promise.all([
      this.client
        .from('users')
        .select('id, telegram_user_id, username, language_code, timezone')
        .eq('id', userId)
        .single(),
      this.client
        .from('user_profiles')
        .select('*')
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
    const profile = assertSupabaseSingle(profileResponse, 'Failed to load profile') as Record<string, unknown>;
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

    const usage: UsageCounterSnapshot[] = (Object.entries(FREE_PLAN_LIMITS) as Array<[UsageMetric, number | null]>).map(([metric, limit]) => {
      const used = usageResponse.data?.find((entry) => entry.metric === metric)?.used_count ?? 0;
      return {
        limit: subscription.is_premium ? null : limit,
        metric,
        used,
      };
    });

    const resolvedRole = this.adminTelegramIds.has(user.telegram_user_id)
      ? 'admin'
      : String(profile.role);

    return {
      baseCurrency: String(profile.base_currency ?? 'UZS') as CurrencyCode,
      displayName: String(profile.display_name),
      locale: user.language_code,
      phoneNumber: this.extractPhoneNumber(profile),
      role: resolvedRole as UserProfileSnapshot['role'],
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
      username: user.username,
      userId: user.id,
    };
  }

  async savePhoneNumber(userId: string, rawPhoneNumber: string) {
    const normalized = this.normalizePhoneNumber(rawPhoneNumber);
    const verifiedAt = new Date().toISOString();

    const { error } = await this.client
      .from('user_profiles')
      .update({
        phone_number: normalized,
        phone_verified_at: verifiedAt,
      })
      .eq('user_id', userId);

    if (error) {
      if (error.code === '42703') {
        const { error: fallbackError } = await this.client
          .from('user_profiles')
          .update({
            bio: JSON.stringify({
              phoneNumber: normalized,
              phoneVerifiedAt: verifiedAt,
            }),
          })
          .eq('user_id', userId);

        if (fallbackError) {
          throw new AppError('Failed to save phone number', 500, 'DATABASE_ERROR', { details: fallbackError });
        }

        this.logger.warn('phone_number_saved_using_bio_fallback', { userId });
        return normalized;
      }

      if (error.code === '23505') {
        throw new AppError('Phone number already linked to another account', 409, 'PHONE_ALREADY_USED');
      }

      throw new AppError('Failed to save phone number', 500, 'DATABASE_ERROR', { details: error });
    }

    this.logger.info('phone_number_saved', { userId });

    return normalized;
  }

  private normalizePhoneNumber(rawPhoneNumber: string) {
    const compact = rawPhoneNumber.replace(/[^\d+]/g, '');
    const normalized = compact.startsWith('+')
      ? `+${compact.slice(1).replace(/\D/g, '')}`
      : `+${compact.replace(/\D/g, '')}`;

    if (!/^\+\d{7,20}$/.test(normalized)) {
      throw new AppError('Invalid phone number format', 400, 'INVALID_PHONE_NUMBER');
    }

    return normalized;
  }

  private extractPhoneNumber(profile: Record<string, unknown>) {
    if (typeof profile.phone_number === 'string' && profile.phone_number) {
      return profile.phone_number;
    }

    if (typeof profile.bio === 'string' && profile.bio.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(profile.bio) as { phoneNumber?: unknown };
        if (typeof parsed.phoneNumber === 'string') {
          return parsed.phoneNumber;
        }
      } catch {
        return null;
      }
    }

    return null;
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

  async getNotificationSettings(userId: string): Promise<NotificationSettingsSnapshot> {
    await this.client.from('notification_settings').upsert({
      user_id: userId,
    });

    const response = await this.client
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const settings = assertSupabaseSingle(response, 'Failed to load notification settings') as Record<string, unknown>;

    return {
      botNotificationsEnabled: Boolean(settings.bot_notifications_enabled),
      debtRemindersEnabled: Boolean(settings.debt_reminders_enabled),
      limitRemindersEnabled: Boolean(settings.limit_reminders_enabled),
      planRemindersEnabled: Boolean(settings.plan_reminders_enabled),
      quietHoursFrom: typeof settings.quiet_hours_from === 'string' ? settings.quiet_hours_from : null,
      quietHoursTo: typeof settings.quiet_hours_to === 'string' ? settings.quiet_hours_to : null,
      subscriptionRemindersEnabled: Boolean(settings.subscription_reminders_enabled),
    };
  }

  async updateNotificationSettings(
    userId: string,
    payload: Partial<NotificationSettingsSnapshot>,
  ) {
    const { error } = await this.client
      .from('notification_settings')
      .upsert({
        bot_notifications_enabled: payload.botNotificationsEnabled,
        debt_reminders_enabled: payload.debtRemindersEnabled,
        limit_reminders_enabled: payload.limitRemindersEnabled,
        plan_reminders_enabled: payload.planRemindersEnabled,
        quiet_hours_from: payload.quietHoursFrom,
        quiet_hours_to: payload.quietHoursTo,
        subscription_reminders_enabled: payload.subscriptionRemindersEnabled,
        user_id: userId,
      });

    if (error) {
      throw new AppError('Failed to update notification settings', 500, 'DATABASE_ERROR', { details: error });
    }

    this.logger.info('notification_settings_updated', { userId });
    return this.getNotificationSettings(userId);
  }

  async listCategories(userId: string): Promise<CategorySnapshot[]> {
    const { data, error } = await this.client
      .from('categories')
      .select('id, icon, is_active, is_system, kind, name, slug')
      .eq('is_active', true)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new AppError('Failed to load categories', 500, 'DATABASE_ERROR', { details: error });
    }

    return (data ?? []).map((category) => ({
      id: category.id,
      icon: category.icon,
      isActive: category.is_active,
      isSystem: category.is_system,
      kind: category.kind,
      name: category.name,
      slug: category.slug,
    }));
  }

  async buildDashboard(userId: string, timeZone: string): Promise<DashboardSnapshot> {
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
        const currency = String(item.original_currency);
        const direction = item.direction as TransactionDirection;
        const bucket = accumulator[currency] ?? { expense: 0, income: 0 };

        if (direction === 'expense' || direction === 'income') {
          bucket[direction] += Number(item.original_amount);
        }

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
