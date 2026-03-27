import type { UsageMetric } from '../domain/enums';

export const FREE_PLAN_LIMITS: Record<UsageMetric, number | null> = {
  debt_create: 0,
  finance_entry_create: 30,
  plan_create: 3,
};

export const PREMIUM_PLAN_LIMITS: Record<UsageMetric, number | null> = {
  debt_create: null,
  finance_entry_create: null,
  plan_create: null,
};

export const PREMIUM_ONLY_FEATURES = [
  'admin.diagnostics',
  'debt.management',
  'finance.limits',
  'theme.gold',
] as const;

export type PremiumFeatureKey = (typeof PREMIUM_ONLY_FEATURES)[number];
