import type { SupabaseClient } from '@supabase/supabase-js';
import { FREE_PLAN_LIMITS, type PremiumFeatureKey, startOfMonthIso, type UsageMetric } from '@yordamchi/shared';
import { AppError } from '../../core/errors/app-error';
import { findCurrentMonthUsage } from '../../lib/supabase-helpers';

export class QuotaService {
  constructor(private readonly client: SupabaseClient) {}

  async getSubscriptionSnapshot(userId: string) {
    const { data, error } = await this.client.rpc('subscription_snapshot', {
      p_user_id: userId,
    });

    if (error) {
      throw new AppError('Failed to load subscription status', 500, 'DATABASE_ERROR', { details: error });
    }

    return data?.[0] ?? {
      current_period_end: null,
      is_premium: false,
      status: 'inactive',
      tier: 'free',
    };
  }

  async assertMetricAvailable(userId: string, metric: UsageMetric, timeZone: string) {
    const subscription = await this.getSubscriptionSnapshot(userId);

    if (subscription.is_premium) {
      return subscription;
    }

    const limit = FREE_PLAN_LIMITS[metric];

    if (limit === null || limit <= 0) {
      throw new AppError('Premium access required', 403, 'PREMIUM_REQUIRED', {
        feature: metric,
      });
    }

    const used = await findCurrentMonthUsage(this.client, userId, metric, startOfMonthIso(new Date(), timeZone));

    if (used >= limit) {
      throw new AppError('Quota exceeded', 403, 'QUOTA_EXCEEDED', {
        limit,
        metric,
        used,
      });
    }

    return subscription;
  }

  async assertPremiumFeature(userId: string, feature: PremiumFeatureKey) {
    const subscription = await this.getSubscriptionSnapshot(userId);

    if (!subscription.is_premium) {
      throw new AppError('Premium access required', 403, 'PREMIUM_REQUIRED', {
        feature,
      });
    }

    return subscription;
  }
}
