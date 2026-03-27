import { z } from 'zod';
import {
  categoryKinds,
  currencyCodes,
  debtDirections,
  intentNames,
  locales,
  planPriorities,
  planStatuses,
  repeatRules,
  themeKeys,
  transactionDirections,
  transactionStatuses,
} from '../enums';

export const localeSchema = z.enum(locales);
export const currencyCodeSchema = z.enum(currencyCodes);
export const transactionDirectionSchema = z.enum(transactionDirections);
export const transactionStatusSchema = z.enum(transactionStatuses);
export const debtDirectionSchema = z.enum(debtDirections);
export const planPrioritySchema = z.enum(planPriorities);
export const planStatusSchema = z.enum(planStatuses);
export const repeatRuleSchema = z.enum(repeatRules);
export const categoryKindSchema = z.enum(categoryKinds);
export const themeKeySchema = z.enum(themeKeys);
export const intentNameSchema = z.enum(intentNames);

export const sessionExchangeSchema = z.object({
  initData: z.string().min(10),
  timezone: z.string().min(1).default('UTC'),
});

export const parseCommandSchema = z.object({
  text: z.string().min(1).max(1000),
  locale: localeSchema.default('uz'),
  timezone: z.string().min(1).default('UTC'),
  defaultCurrency: currencyCodeSchema.default('UZS'),
  nowIso: z.string().datetime().optional(),
});

export const createPlanSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  dueAt: z.string().datetime(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  timezone: z.string().min(1),
  status: planStatusSchema.default('pending'),
  priority: planPrioritySchema.default('medium'),
  repeatRule: repeatRuleSchema.default('none'),
  reminderOffsetMinutes: z.number().int().min(0).max(10080).default(60),
  sourceText: z.string().max(1000).optional(),
  parserConfidence: z.number().min(0).max(1).optional(),
});

export const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  direction: transactionDirectionSchema,
  amount: z.number().positive(),
  currency: currencyCodeSchema,
  occurredAt: z.string().datetime(),
  status: transactionStatusSchema.default('posted'),
  note: z.string().max(1000).optional(),
  sourceText: z.string().max(1000).optional(),
  parserConfidence: z.number().min(0).max(1).optional(),
});

export const createDebtSchema = z.object({
  counterpartyName: z.string().min(1).max(160),
  direction: debtDirectionSchema,
  amount: z.number().positive(),
  currency: currencyCodeSchema,
  issuedAt: z.string().datetime(),
  dueAt: z.string().datetime().nullable().optional(),
  note: z.string().max(1000).optional(),
  sourceText: z.string().max(1000).optional(),
  parserConfidence: z.number().min(0).max(1).optional(),
});

export const createDebtPaymentSchema = z.object({
  debtId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.number().positive(),
  currency: currencyCodeSchema,
  paidAt: z.string().datetime(),
  note: z.string().max(1000).optional(),
});

export const createCategoryLimitSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  currency: currencyCodeSchema,
  monthStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  warningThresholdPercent: z.number().min(1).max(100).default(80),
});

export const updateCategoryLimitSchema = z.object({
  amount: z.number().positive().optional(),
  categoryId: z.string().uuid().optional(),
  currency: currencyCodeSchema.optional(),
  isActive: z.boolean().optional(),
  monthStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  warningThresholdPercent: z.number().min(1).max(100).optional(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  locale: localeSchema.optional(),
  timezone: z.string().min(1).optional(),
  themePreference: themeKeySchema.optional(),
  baseCurrency: currencyCodeSchema.optional(),
});

export const updateNotificationSettingsSchema = z.object({
  botNotificationsEnabled: z.boolean().optional(),
  debtRemindersEnabled: z.boolean().optional(),
  limitRemindersEnabled: z.boolean().optional(),
  planRemindersEnabled: z.boolean().optional(),
  quietHoursFrom: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  quietHoursTo: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  subscriptionRemindersEnabled: z.boolean().optional(),
});

export const adminGrantPremiumSchema = z.object({
  targetTelegramUserId: z.number().int().positive().optional(),
  targetUserId: z.string().uuid().optional(),
  months: z.number().int().min(1).max(24),
}).superRefine((value, context) => {
  if (!value.targetUserId && !value.targetTelegramUserId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'targetUserId or targetTelegramUserId is required',
      path: ['targetUserId'],
    });
  }
});
