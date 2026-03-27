import type { SupabaseClient } from '@supabase/supabase-js';
import { FREE_PLAN_LIMITS, startOfMonthIso, type AdminDiagnosticLog, type AdminOverview, type AdminPremiumUserSummary, type AdminQuotaInsight, type AdminUserAction } from '@yordamchi/shared';
import { AppError } from '../../core/errors/app-error';

export class AdminService {
  constructor(private readonly client: SupabaseClient) {}

  private async resolveUserDirectory(userIds: string[]) {
    if (!userIds.length) {
      return new Map<string, { displayName: string; telegramUserId: number | null; username: string | null }>();
    }

    const [usersResponse, profilesResponse] = await Promise.all([
      this.client
        .from('users')
        .select('id, telegram_user_id, username, first_name, last_name')
        .in('id', userIds),
      this.client
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', userIds),
    ]);

    if (usersResponse.error || profilesResponse.error) {
      throw new AppError('Failed to resolve admin user directory', 500, 'DATABASE_ERROR', {
        details: {
          profiles: profilesResponse.error,
          users: usersResponse.error,
        },
      });
    }

    const profileNames = new Map((profilesResponse.data ?? []).map((profile) => [profile.user_id, profile.display_name]));

    return new Map((usersResponse.data ?? []).map((user) => [
      user.id,
      {
        displayName: profileNames.get(user.id) ?? (([user.first_name, user.last_name].filter(Boolean).join(' ').trim()) || user.username || 'User'),
        telegramUserId: user.telegram_user_id ?? null,
        username: user.username ?? null,
      },
    ]));
  }

  async overview(query = ''): Promise<AdminOverview> {
    const currentMonth = startOfMonthIso(new Date(), 'UTC');
    const [users, subscriptions, reminders, errors, parserErrors, reminderFailures, premiumSubscriptions, usageCounters, recentActions] = await Promise.all([
      this.client.from('users').select('*', { count: 'exact', head: true }),
      this.client.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('tier', 'premium'),
      this.client.from('reminders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
      this.client.from('bot_logs').select('*', { count: 'exact', head: true }).eq('level', 'error'),
      this.client
        .from('bot_logs')
        .select('context, created_at, event, level, message, user_id')
        .or('event.ilike.%parser%,event.eq.telegram_update_failed')
        .order('created_at', { ascending: false })
        .limit(8),
      this.client
        .from('bot_logs')
        .select('context, created_at, event, level, message, user_id')
        .eq('event', 'reminder_dispatch_failed')
        .order('created_at', { ascending: false })
        .limit(8),
      this.client
        .from('subscriptions')
        .select('current_period_end, status, user_id')
        .eq('tier', 'premium')
        .eq('status', 'active')
        .order('current_period_end', { ascending: true })
        .limit(6),
      this.client
        .from('usage_counters')
        .select('limit_count, metric, used_count, user_id')
        .eq('usage_month', currentMonth),
      this.client
        .from('audit_logs')
        .select('action, actor_user_id, created_at, entity_id, entity_type, level, subject_user_id')
        .order('created_at', { ascending: false })
        .limit(36),
    ]);

    if (users.error || subscriptions.error || reminders.error || errors.error || parserErrors.error || reminderFailures.error || premiumSubscriptions.error || usageCounters.error || recentActions.error) {
      throw new AppError('Failed to load admin overview', 500, 'DATABASE_ERROR', {
        errors: {
          botLogs: errors.error,
          parserErrors: parserErrors.error,
          premiumSubscriptions: premiumSubscriptions.error,
          recentActions: recentActions.error,
          reminderFailures: reminderFailures.error,
          reminders: reminders.error,
          subscriptions: subscriptions.error,
          usageCounters: usageCounters.error,
          users: users.error,
        },
      });
    }

    const actionUserIds = Array.from(new Set((recentActions.data ?? []).flatMap((item) => [item.actor_user_id, item.subject_user_id]).filter(Boolean))) as string[];
    const premiumUserIds = Array.from(new Set((premiumSubscriptions.data ?? []).map((item) => item.user_id)));
    const directory = await this.resolveUserDirectory([...new Set([...actionUserIds, ...premiumUserIds])]);

    const normalizedParserErrors: AdminDiagnosticLog[] = (parserErrors.data ?? []).map((entry) => ({
      context: entry.context ?? {},
      createdAt: entry.created_at,
      event: entry.event,
      level: entry.level,
      message: entry.message,
      userId: entry.user_id,
    }));

    const normalizedReminderFailures: AdminDiagnosticLog[] = (reminderFailures.data ?? []).map((entry) => ({
      context: entry.context ?? {},
      createdAt: entry.created_at,
      event: entry.event,
      level: entry.level,
      message: entry.message,
      userId: entry.user_id,
    }));

    const premiumUsers: AdminPremiumUserSummary[] = (premiumSubscriptions.data ?? []).map((subscription) => {
      const directoryEntry = directory.get(subscription.user_id);
      return {
        currentPeriodEnd: subscription.current_period_end,
        displayName: directoryEntry?.displayName ?? 'User',
        subscriptionStatus: subscription.status,
        telegramUserId: directoryEntry?.telegramUserId ?? 0,
        userId: subscription.user_id,
        username: directoryEntry?.username ?? null,
      };
    });

    const quotaInsightMap = new Map<AdminQuotaInsight['metric'], AdminQuotaInsight>();
    for (const metric of Object.keys(FREE_PLAN_LIMITS) as AdminQuotaInsight['metric'][]) {
      quotaInsightMap.set(metric, {
        limit: FREE_PLAN_LIMITS[metric],
        metric,
        tier: 'free',
        totalUsed: 0,
        usersAtRisk: 0,
      });
    }

    (usageCounters.data ?? []).forEach((item) => {
      const insight = quotaInsightMap.get(item.metric);
      if (!insight) {
        return;
      }

      const resolvedLimit = item.limit_count ?? insight.limit;
      insight.totalUsed += item.used_count;
      if (resolvedLimit && item.used_count >= resolvedLimit * 0.8) {
        insight.usersAtRisk += 1;
      }
    });

    const normalizedActions: AdminUserAction[] = (recentActions.data ?? [])
      .map((entry) => {
        const actor = entry.actor_user_id ? directory.get(entry.actor_user_id) : null;
        const subject = entry.subject_user_id ? directory.get(entry.subject_user_id) : null;

        return {
          action: entry.action,
          actorDisplayName: actor?.displayName ?? 'System',
          actorTelegramUserId: actor?.telegramUserId ?? null,
          actorUserId: entry.actor_user_id,
          createdAt: entry.created_at,
          entityId: entry.entity_id,
          entityType: entry.entity_type,
          level: entry.level,
          subjectDisplayName: subject?.displayName ?? null,
          subjectTelegramUserId: subject?.telegramUserId ?? null,
          subjectUserId: entry.subject_user_id,
        };
      })
      .filter((entry) => {
        if (!query.trim()) {
          return true;
        }

        const haystack = [
          entry.action,
          entry.actorDisplayName,
          entry.actorTelegramUserId,
          entry.subjectDisplayName,
          entry.subjectTelegramUserId,
          entry.entityType,
        ].join(' ').toLowerCase();

        return haystack.includes(query.trim().toLowerCase());
      })
      .slice(0, 12);

    return {
      activePremiumUsers: subscriptions.count ?? 0,
      metrics: [
        { label: 'Users', tone: 'info', value: users.count ?? 0 },
        { label: 'Premium', tone: 'premium', value: subscriptions.count ?? 0 },
        { label: 'Reminder queue', tone: 'warning', value: reminders.count ?? 0 },
        { label: 'Errors', tone: 'danger', value: errors.count ?? 0 },
      ],
      pendingReminders: reminders.count ?? 0,
      premiumUsers,
      quotaInsights: Array.from(quotaInsightMap.values()),
      recentParserErrors: normalizedParserErrors,
      recentReminderFailures: normalizedReminderFailures,
      recentUserActions: normalizedActions,
      recentErrors: errors.count ?? 0,
      totalUsers: users.count ?? 0,
    };
  }

  async grantPremium(targetUserId: string, actorUserId: string, months: number) {
    const { data, error } = await this.client.rpc('grant_premium_subscription', {
      p_actor_user_id: actorUserId,
      p_months: months,
      p_target_user_id: targetUserId,
    });

    if (error) {
      throw new AppError('Failed to grant premium subscription', 500, 'DATABASE_ERROR', { details: error });
    }

    return data;
  }
}
