import type {
  AppLocale,
  CurrencyCode,
  DebtDirection,
  IntentName,
  NotificationChannel,
  PlanPriority,
  PlanStatus,
  ReminderKind,
  RepeatRule,
  SubscriptionStatus,
  SubscriptionTier,
  ThemeKey,
  TransactionDirection,
  TransactionStatus,
  UsageMetric,
} from '../enums';

export interface TelegramUserPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface AppSession {
  token: string;
  expiresAt: string;
}

export interface SubscriptionSnapshot {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  isPremium: boolean;
}

export interface UsageCounterSnapshot {
  metric: UsageMetric;
  used: number;
  limit: number | null;
}

export interface UserProfileSnapshot {
  userId: string;
  telegramUserId: number;
  displayName: string;
  username?: string | null;
  phoneNumber?: string | null;
  locale: AppLocale;
  timezone: string;
  themePreference: ThemeKey;
  baseCurrency: CurrencyCode;
  role: 'user' | 'support' | 'admin' | 'owner';
  subscription: SubscriptionSnapshot;
  usage: UsageCounterSnapshot[];
}

export interface AmountParseResult {
  amount: number | null;
  raw: string | null;
  currency: CurrencyCode | null;
  multiplier: number;
  confidence: number;
}

export interface DateParseResult {
  matched: boolean;
  allDay: boolean;
  dueAt: string | null;
  date: string | null;
  time: string | null;
  matchedText: string | null;
  confidence: number;
}

export interface ReminderParseResult {
  offsetMinutes: number | null;
  explicit: boolean;
}

export interface IntentScore {
  intent: IntentName;
  score: number;
  reasons: string[];
}

export interface ParsedExpenseOrIncome {
  amount: number;
  currency: CurrencyCode;
  direction: TransactionDirection;
  categorySlug: string;
  occurredAt: string;
  status: TransactionStatus;
  note: string;
}

export interface ParsedDebt {
  counterpartyName: string;
  direction: DebtDirection;
  amount: number;
  currency: CurrencyCode;
  dueAt?: string | null;
  note: string;
}

export interface ParsedPlan {
  title: string;
  description?: string;
  dueAt: string;
  scheduledDate: string;
  scheduledTime?: string | null;
  status: PlanStatus;
  priority: PlanPriority;
  repeatRule: RepeatRule;
  reminderOffsetMinutes: number;
}

export interface ParsedCategoryLimit {
  categorySlug: string;
  amount: number;
  currency: CurrencyCode;
  monthStart: string;
}

export interface ParsedCommand {
  intent: IntentName;
  confidence: number;
  scores: IntentScore[];
  normalizedText: string;
  locale: AppLocale;
  amount?: AmountParseResult;
  date?: DateParseResult;
  reminder?: ReminderParseResult;
  transaction?: ParsedExpenseOrIncome;
  debt?: ParsedDebt;
  plan?: ParsedPlan;
  limit?: ParsedCategoryLimit;
  fallbackMessageKey?: string;
}

export interface CreatePlanInput {
  title: string;
  description?: string;
  dueAt: string;
  scheduledDate: string;
  scheduledTime?: string | null;
  timezone: string;
  status?: PlanStatus;
  priority?: PlanPriority;
  repeatRule?: RepeatRule;
  reminderOffsetMinutes?: number;
  sourceText?: string;
  parserConfidence?: number;
}

export interface CreateTransactionInput {
  accountId: string;
  categoryId?: string;
  direction: TransactionDirection;
  amount: number;
  currency: CurrencyCode;
  occurredAt: string;
  status?: TransactionStatus;
  note?: string;
  sourceText?: string;
  parserConfidence?: number;
}

export interface CreateDebtInput {
  counterpartyName: string;
  direction: DebtDirection;
  amount: number;
  currency: CurrencyCode;
  issuedAt: string;
  dueAt?: string | null;
  note?: string;
  sourceText?: string;
  parserConfidence?: number;
}

export interface CreateDebtPaymentInput {
  debtId: string;
  accountId: string;
  amount: number;
  currency: CurrencyCode;
  paidAt: string;
  note?: string;
}

export interface CreateCategoryLimitInput {
  categoryId: string;
  amount: number;
  currency: CurrencyCode;
  monthStart: string;
  warningThresholdPercent?: number;
}

export interface ReminderDeliveryPayload {
  reminderId: string;
  userId: string;
  kind: ReminderKind;
  channel: NotificationChannel;
  title: string;
  body: string;
  actionLabel?: string | null;
  deepLink?: string | null;
}

export interface CalendarDayIndicator {
  date: string;
  hasPlans: boolean;
  hasReminders: boolean;
  hasDebtDue: boolean;
  hasLargeExpense: boolean;
  totalExpense: number;
  currency: CurrencyCode;
}

export interface CalendarDayItem {
  id: string;
  kind: 'debt' | 'plan' | 'reminder' | 'transaction';
  title?: string | null;
  note?: string | null;
  counterparty_name?: string | null;
  entity_type?: string | null;
  [key: string]: unknown;
}

export interface CalendarDayDetails {
  date: string;
  hasDebtDue: boolean;
  hasLargeExpense: boolean;
  hasPlans: boolean;
  hasReminders: boolean;
  items: CalendarDayItem[];
}

export interface CalendarMonthSnapshot {
  days: CalendarDayDetails[];
  monthStart: string;
}

export interface DashboardAccount {
  id: string;
  name: string;
  currency: CurrencyCode;
  current_balance: number;
  is_default: boolean;
}

export interface DashboardPlan {
  id: string;
  title: string;
  due_at: string;
  priority: PlanPriority;
  status: PlanStatus;
}

export interface DashboardDebt {
  id: string;
  counterparty_name: string;
  principal_amount: number;
  principal_currency: CurrencyCode;
  due_at: string | null;
  status: string;
  direction: DebtDirection;
}

export interface DashboardSnapshot {
  accounts: DashboardAccount[];
  monthSummary: Record<string, { expense: number; income: number }>;
  openDebts: DashboardDebt[];
  todayPlans: DashboardPlan[];
  upcomingPlans: DashboardPlan[];
}

export interface NotificationSettingsSnapshot {
  botNotificationsEnabled: boolean;
  debtRemindersEnabled: boolean;
  limitRemindersEnabled: boolean;
  planRemindersEnabled: boolean;
  quietHoursFrom?: string | null;
  quietHoursTo?: string | null;
  subscriptionRemindersEnabled: boolean;
}

export interface CategorySnapshot {
  id: string;
  icon?: string | null;
  isActive: boolean;
  isSystem: boolean;
  kind: 'expense' | 'income' | 'general';
  name: string;
  slug: string;
}

export interface SessionBootstrapResponse {
  dashboard: DashboardSnapshot;
  profile: UserProfileSnapshot;
}

export interface SessionExchangeResponse extends SessionBootstrapResponse {
  session: AppSession;
}

export interface AdminGrantPremiumInput {
  targetTelegramUserId?: number;
  targetUserId?: string;
  months: number;
}

export interface AdminOverview {
  totalUsers: number;
  activePremiumUsers: number;
  pendingReminders: number;
  recentErrors: number;
}
