export const locales = ['uz', 'en', 'ru'] as const;
export type AppLocale = (typeof locales)[number];

export const currencyCodes = ['UZS', 'USD'] as const;
export type CurrencyCode = (typeof currencyCodes)[number];

export const themeKeys = ['blue', 'gold', 'graphite', 'mint'] as const;
export type ThemeKey = (typeof themeKeys)[number];

export const userRoles = ['user', 'support', 'admin', 'owner'] as const;
export type UserRole = (typeof userRoles)[number];

export const subscriptionTiers = ['free', 'premium'] as const;
export type SubscriptionTier = (typeof subscriptionTiers)[number];

export const subscriptionStatuses = ['active', 'inactive', 'expired', 'cancelled'] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const usageMetrics = ['plan_create', 'finance_entry_create', 'debt_create'] as const;
export type UsageMetric = (typeof usageMetrics)[number];

export const categoryKinds = ['expense', 'income', 'general'] as const;
export type CategoryKind = (typeof categoryKinds)[number];

export const planStatuses = ['pending', 'completed', 'cancelled', 'missed'] as const;
export type PlanStatus = (typeof planStatuses)[number];

export const planPriorities = ['low', 'medium', 'high', 'urgent'] as const;
export type PlanPriority = (typeof planPriorities)[number];

export const repeatRules = ['none', 'daily', 'weekly', 'monthly'] as const;
export type RepeatRule = (typeof repeatRules)[number];

export const transactionDirections = ['income', 'expense'] as const;
export type TransactionDirection = (typeof transactionDirections)[number];

export const transactionKinds = ['standard', 'debt_disbursement', 'debt_repayment', 'adjustment'] as const;
export type TransactionKind = (typeof transactionKinds)[number];

export const transactionStatuses = ['scheduled', 'posted', 'cancelled'] as const;
export type TransactionStatus = (typeof transactionStatuses)[number];

export const debtDirections = ['borrowed', 'lent'] as const;
export type DebtDirection = (typeof debtDirections)[number];

export const debtStatuses = ['open', 'partially_paid', 'paid', 'overdue', 'cancelled'] as const;
export type DebtStatus = (typeof debtStatuses)[number];

export const reminderKinds = [
  'plan_due',
  'transaction_due',
  'debt_due',
  'limit_warning',
  'limit_exceeded',
  'subscription_expiring',
  'generic',
] as const;
export type ReminderKind = (typeof reminderKinds)[number];

export const reminderStatuses = ['pending', 'processing', 'sent', 'failed', 'cancelled'] as const;
export type ReminderStatus = (typeof reminderStatuses)[number];

export const notificationChannels = ['telegram', 'in_app'] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

export const intentNames = [
  'create_plan',
  'create_income',
  'create_expense',
  'create_debt',
  'repay_debt',
  'set_limit',
  'view_summary',
  'open_miniapp',
  'help',
  'unknown',
] as const;
export type IntentName = (typeof intentNames)[number];
