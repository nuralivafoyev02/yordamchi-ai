import type { SupabaseClient } from '@supabase/supabase-js';
import type { CategoryLimitSnapshot, CreateCategoryLimitInput, CreateDebtInput, CreateDebtPaymentInput, CreateTransactionInput } from '@yordamchi/shared';
import { t } from '@yordamchi/shared';
import { AppError } from '../../core/errors/app-error';
import type { EnvBindings } from '../../core/config/env';
import { assertSupabaseSingle } from '../../lib/supabase-helpers';
import { ReminderService } from './reminder-service';

export class FinanceService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly reminderService: ReminderService,
    private readonly env: EnvBindings,
  ) {}

  async getDefaultAccount(userId: string, currency: 'UZS' | 'USD') {
    const response = await this.client
      .from('accounts')
      .select('id, currency')
      .eq('user_id', userId)
      .eq('currency', currency)
      .eq('is_default', true)
      .eq('is_archived', false)
      .single();

    return assertSupabaseSingle(response, 'Failed to resolve account');
  }

  async resolveCategoryId(userId: string, slug: string, kind: 'expense' | 'income' | 'general' = 'general') {
    const { data, error } = await this.client
      .from('categories')
      .select('id, user_id')
      .eq('slug', slug)
      .in('kind', kind === 'general' ? ['general'] : [kind, 'general'])
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('user_id', { ascending: false })
      .limit(1);

    if (error || !data?.[0]) {
      throw new AppError('Failed to resolve category', 500, 'DATABASE_ERROR', { details: error });
    }

    return data[0].id as string;
  }

  async createTransaction(userId: string, locale: 'uz' | 'en' | 'ru', input: CreateTransactionInput) {
    const { data, error } = await this.client
      .from('transactions')
      .insert({
        account_id: input.accountId,
        category_id: input.categoryId ?? null,
        created_via: 'bot',
        direction: input.direction,
        note: input.note ?? null,
        occurred_at: input.occurredAt,
        original_amount: input.amount,
        original_currency: input.currency,
        parser_confidence: input.parserConfidence ?? null,
        source_text: input.sourceText ?? null,
        status: input.status ?? 'posted',
        user_id: userId,
      })
      .select('id, occurred_at, note, status')
      .single();

    if (error || !data) {
      throw new AppError('Failed to create transaction', 500, 'DATABASE_ERROR', { details: error });
    }

    if (data.status === 'scheduled' && new Date(data.occurred_at).getTime() > Date.now()) {
      await this.reminderService.enqueue({
        actionLabel: t(locale, 'common.openMiniApp'),
        body: data.note ?? t(locale, 'finance.expense'),
        dedupeKey: `transaction:${data.id}:${data.occurred_at}`,
        deepLink: `${this.env.TELEGRAM_MINIAPP_URL}?tab=finance`,
        entityId: data.id,
        entityType: 'transaction',
        kind: 'transaction_due',
        scheduledFor: data.occurred_at,
        title: t(locale, 'bot.reminderDue'),
        userId,
      });
    }

    return data;
  }

  async createDebt(userId: string, locale: 'uz' | 'en' | 'ru', input: CreateDebtInput) {
    const { data, error } = await this.client
      .from('debts')
      .insert({
        counterparty_name: input.counterpartyName,
        created_via: 'bot',
        direction: input.direction,
        due_at: input.dueAt ?? null,
        issued_at: input.issuedAt,
        note: input.note ?? null,
        parser_confidence: input.parserConfidence ?? null,
        principal_amount: input.amount,
        principal_currency: input.currency,
        source_text: input.sourceText ?? null,
        user_id: userId,
      })
      .select('id, due_at, counterparty_name')
      .single();

    if (error || !data) {
      throw new AppError('Failed to create debt', 500, 'DATABASE_ERROR', { details: error });
    }

    if (data.due_at && new Date(data.due_at).getTime() > Date.now()) {
      await this.reminderService.enqueue({
        actionLabel: t(locale, 'common.openMiniApp'),
        body: data.counterparty_name,
        dedupeKey: `debt:${data.id}:${data.due_at}`,
        deepLink: `${this.env.TELEGRAM_MINIAPP_URL}?tab=finance`,
        entityId: data.id,
        entityType: 'debt',
        kind: 'debt_due',
        scheduledFor: data.due_at,
        title: t(locale, 'bot.reminderDue'),
        userId,
      });
    }

    return data;
  }

  async createDebtPayment(userId: string, input: CreateDebtPaymentInput) {
    const { data: debt, error: debtError } = await this.client
      .from('debts')
      .select('direction')
      .eq('id', input.debtId)
      .eq('user_id', userId)
      .single();

    if (debtError || !debt) {
      throw new AppError('Debt not found', 404, 'DEBT_NOT_FOUND', { details: debtError });
    }

    const transaction = await this.createTransaction(userId, 'uz', {
      accountId: input.accountId,
      amount: input.amount,
      categoryId: undefined,
      currency: input.currency,
      direction: debt.direction === 'borrowed' ? 'expense' : 'income',
      note: input.note ?? 'Debt payment',
      occurredAt: input.paidAt,
      status: 'posted',
    });

    const { error } = await this.client.from('debt_payments').insert({
      account_id: input.accountId,
      amount: input.amount,
      currency: input.currency,
      debt_id: input.debtId,
      linked_transaction_id: transaction.id,
      note: input.note ?? null,
      paid_at: input.paidAt,
      user_id: userId,
    });

    if (error) {
      throw new AppError('Failed to create debt payment', 500, 'DATABASE_ERROR', { details: error });
    }
  }

  async createCategoryLimit(userId: string, input: CreateCategoryLimitInput) {
    const { error } = await this.client.from('category_limits').upsert({
      alert_on_exceed: true,
      category_id: input.categoryId,
      currency: input.currency,
      is_active: true,
      limit_amount: input.amount,
      month_start: input.monthStart,
      user_id: userId,
      warning_threshold_percent: input.warningThresholdPercent ?? 80,
    });

    if (error) {
      throw new AppError('Failed to save category limit', 500, 'DATABASE_ERROR', { details: error });
    }
  }

  async listCategoryLimits(userId: string, monthStart: string): Promise<CategoryLimitSnapshot[]> {
    const monthAnchor = new Date(`${monthStart}T00:00:00.000Z`);
    const nextMonthStart = new Date(Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth() + 1, 1))
      .toISOString()
      .slice(0, 10);

    const { data: limits, error: limitsError } = await this.client
      .from('category_limits')
      .select(`
        id,
        currency,
        month_start,
        limit_amount,
        warning_threshold_percent,
        alert_on_exceed,
        is_active,
        category:categories (
          id,
          icon,
          is_active,
          is_system,
          kind,
          name,
          slug
        )
      `)
      .eq('user_id', userId)
      .eq('month_start', monthStart)
      .order('created_at', { ascending: false });

    if (limitsError) {
      throw new AppError('Failed to load category limits', 500, 'DATABASE_ERROR', { details: limitsError });
    }

    const categoryIds = (limits ?? [])
      .map((limit) => {
        const category = Array.isArray(limit.category) ? limit.category[0] : limit.category;
        return category?.id as string | undefined;
      })
      .filter((value): value is string => Boolean(value));

    if (!limits?.length || !categoryIds.length) {
      return [];
    }

    const { data: transactions, error: transactionsError } = await this.client
      .from('transactions')
      .select('category_id, original_amount, original_currency')
      .eq('user_id', userId)
      .eq('direction', 'expense')
      .is('deleted_at', null)
      .gte('occurred_at', `${monthStart}T00:00:00.000Z`)
      .lt('occurred_at', `${nextMonthStart}T00:00:00.000Z`)
      .in('category_id', categoryIds);

    if (transactionsError) {
      throw new AppError('Failed to load limit progress', 500, 'DATABASE_ERROR', { details: transactionsError });
    }

    const spentByKey = new Map<string, number>();

    (transactions ?? []).forEach((transaction) => {
      const key = `${transaction.category_id}:${transaction.original_currency}`;
      spentByKey.set(key, (spentByKey.get(key) ?? 0) + Number(transaction.original_amount ?? 0));
    });

    return (limits ?? []).flatMap((limit) => {
      const category = Array.isArray(limit.category) ? limit.category[0] : limit.category;

      if (!category) {
        return [];
      }

      const limitAmount = Number(limit.limit_amount ?? 0);
      const spentAmount = spentByKey.get(`${category.id}:${limit.currency}`) ?? 0;
      const progressPercent = limitAmount > 0
        ? Math.min(999, Number(((spentAmount / limitAmount) * 100).toFixed(1)))
        : 0;
      const warningThresholdPercent = Number(limit.warning_threshold_percent ?? 80);
      const status = progressPercent >= 100
        ? 'exceeded'
        : progressPercent >= warningThresholdPercent
          ? 'warning'
          : 'safe';

      return [{
        alertOnExceed: Boolean(limit.alert_on_exceed),
        category: {
          id: category.id,
          icon: category.icon,
          isActive: Boolean(category.is_active),
          isSystem: Boolean(category.is_system),
          kind: category.kind,
          name: category.name,
          slug: category.slug,
        },
        currency: limit.currency,
        id: limit.id,
        isActive: Boolean(limit.is_active),
        limitAmount,
        monthStart: limit.month_start,
        progressPercent,
        remainingAmount: limitAmount - spentAmount,
        spentAmount,
        status,
        warningThresholdPercent,
      } satisfies CategoryLimitSnapshot];
    });
  }

  async updateCategoryLimit(
    userId: string,
    limitId: string,
    input: Partial<CreateCategoryLimitInput & { isActive: boolean }>,
  ) {
    const payload: Record<string, unknown> = {};

    if (input.amount !== undefined) payload.limit_amount = input.amount;
    if (input.categoryId !== undefined) payload.category_id = input.categoryId;
    if (input.currency !== undefined) payload.currency = input.currency;
    if (input.isActive !== undefined) payload.is_active = input.isActive;
    if (input.monthStart !== undefined) payload.month_start = input.monthStart;
    if (input.warningThresholdPercent !== undefined) payload.warning_threshold_percent = input.warningThresholdPercent;

    const { data, error } = await this.client
      .from('category_limits')
      .update(payload)
      .eq('id', limitId)
      .eq('user_id', userId)
      .select('id')
      .single();

    if (error || !data) {
      throw new AppError('Failed to update category limit', 500, 'DATABASE_ERROR', { details: error });
    }

    return data;
  }

  async archiveCategoryLimit(userId: string, limitId: string) {
    const { error } = await this.client
      .from('category_limits')
      .update({ is_active: false })
      .eq('id', limitId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError('Failed to archive category limit', 500, 'DATABASE_ERROR', { details: error });
    }
  }

  async buildMonthlySummary(userId: string, monthStart: string) {
    const monthAnchor = new Date(`${monthStart}T00:00:00.000Z`);
    const nextMonthStart = new Date(Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth() + 1, 1))
      .toISOString()
      .slice(0, 10);

    const { data, error } = await this.client
      .from('transactions')
      .select('direction, original_amount, original_currency, occurred_at, note, status')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('occurred_at', `${monthStart}T00:00:00.000Z`)
      .lt('occurred_at', `${nextMonthStart}T00:00:00.000Z`)
      .order('occurred_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new AppError('Failed to build finance summary', 500, 'DATABASE_ERROR', { details: error });
    }

    return data ?? [];
  }
}
