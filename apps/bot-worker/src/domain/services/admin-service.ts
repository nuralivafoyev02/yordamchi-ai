import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../core/errors/app-error';

export class AdminService {
  constructor(private readonly client: SupabaseClient) {}

  async overview() {
    const [users, subscriptions, reminders, errors] = await Promise.all([
      this.client.from('users').select('*', { count: 'exact', head: true }),
      this.client.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('tier', 'premium'),
      this.client.from('reminders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
      this.client.from('bot_logs').select('*', { count: 'exact', head: true }).eq('level', 'error'),
    ]);

    if (users.error || subscriptions.error || reminders.error || errors.error) {
      throw new AppError('Failed to load admin overview', 500, 'DATABASE_ERROR', {
        errors: {
          botLogs: errors.error,
          reminders: reminders.error,
          subscriptions: subscriptions.error,
          users: users.error,
        },
      });
    }

    return {
      activePremiumUsers: subscriptions.count ?? 0,
      pendingReminders: reminders.count ?? 0,
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
