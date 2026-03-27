import type { ParsedCommand } from '@yordamchi/shared';
import type { AppContext } from '../../core/app-context';
import { AppError } from '../../core/errors/app-error';

export async function executeParsedAction(
  app: AppContext,
  userId: string,
  locale: 'uz' | 'en' | 'ru',
  timeZone: string,
  parsed: ParsedCommand,
) {
  if (parsed.intent === 'create_plan' && parsed.plan) {
    await app.quotaService.assertMetricAvailable(userId, 'plan_create', timeZone);
    return app.planService.create(userId, locale, {
      ...parsed.plan,
      parserConfidence: parsed.confidence,
      sourceText: parsed.normalizedText,
      timezone: timeZone,
    });
  }

  if ((parsed.intent === 'create_income' || parsed.intent === 'create_expense') && parsed.transaction) {
    await app.quotaService.assertMetricAvailable(userId, 'finance_entry_create', timeZone);
    const account = await app.financeService.getDefaultAccount(userId, parsed.transaction.currency);
    const categoryId = await app.financeService.resolveCategoryId(
      userId,
      parsed.transaction.categorySlug,
      parsed.intent === 'create_income' ? 'income' : 'expense',
    );

    return app.financeService.createTransaction(userId, locale, {
      accountId: account.id,
      amount: parsed.transaction.amount,
      categoryId,
      currency: parsed.transaction.currency,
      direction: parsed.transaction.direction,
      note: parsed.transaction.note,
      occurredAt: parsed.transaction.occurredAt,
      parserConfidence: parsed.confidence,
      sourceText: parsed.normalizedText,
      status: parsed.transaction.status,
    });
  }

  if (parsed.intent === 'create_debt' && parsed.debt) {
    await app.quotaService.assertPremiumFeature(userId, 'debt.management');
    return app.financeService.createDebt(userId, locale, {
      amount: parsed.debt.amount,
      counterpartyName: parsed.debt.counterpartyName,
      currency: parsed.debt.currency,
      direction: parsed.debt.direction,
      dueAt: parsed.debt.dueAt,
      issuedAt: new Date().toISOString(),
      note: parsed.debt.note,
      parserConfidence: parsed.confidence,
      sourceText: parsed.normalizedText,
    });
  }

  if (parsed.intent === 'set_limit' && parsed.limit) {
    await app.quotaService.assertPremiumFeature(userId, 'finance.limits');
    const categoryId = await app.financeService.resolveCategoryId(userId, parsed.limit.categorySlug, 'expense');
    await app.financeService.createCategoryLimit(userId, {
      amount: parsed.limit.amount,
      categoryId,
      currency: parsed.limit.currency,
      monthStart: parsed.limit.monthStart,
    });
    return null;
  }

  throw new AppError('Unsupported parsed action', 400, 'UNSUPPORTED_ACTION');
}
