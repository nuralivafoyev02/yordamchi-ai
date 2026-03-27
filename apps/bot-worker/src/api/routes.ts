import { Hono, type MiddlewareHandler } from 'hono';
import {
  adminGrantPremiumSchema,
  createCategoryLimitSchema,
  createDebtPaymentSchema,
  createDebtSchema,
  createPlanSchema,
  createTransactionSchema,
  parseCommandSchema,
  sessionExchangeSchema,
  updateNotificationSettingsSchema,
  updateProfileSchema,
} from '@yordamchi/shared';
import type { AppContext } from '../core/app-context';
import type { EnvBindings } from '../core/config/env';
import { AppError } from '../core/errors/app-error';
import { signAppSession, verifyAppSession } from '../modules/auth/session';
import { verifyTelegramInitData } from '../modules/auth/telegram-init';

type ApiVariables = {
  app: AppContext;
  session: Awaited<ReturnType<typeof verifyAppSession>>;
};

type ApiRoute = {
  Bindings: EnvBindings;
  Variables: ApiVariables;
};

function assertPhoneRegistered(phoneNumber: string | null | undefined) {
  if (!phoneNumber) {
    throw new AppError('Phone registration required', 403, 'PHONE_REGISTRATION_REQUIRED');
  }
}

const bearerAuth: MiddlewareHandler<ApiRoute> = async (c, next) => {
  const authHeader = c.req.header('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw new AppError('Missing bearer token', 401, 'UNAUTHORIZED');
  }

  const session = await verifyAppSession(c.env.APP_JWT_SECRET, token);

  if (!session.phone_registered) {
    throw new AppError('Phone registration required', 403, 'PHONE_REGISTRATION_REQUIRED');
  }

  c.set('session', session);
  await next();
};

const adminOnly: MiddlewareHandler<ApiRoute> = async (c, next) => {
  const session = c.get('session');

  if (!['admin', 'owner'].includes(session.role)) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  await next();
};

export function createApiRouter() {
  const api = new Hono<ApiRoute>();

  api.options('/v1/*', (c) => c.body(null, 204));

  api.post('/v1/session/exchange', async (c) => {
    const app = c.get('app');
    const body = sessionExchangeSchema.parse(await c.req.json());
    let verified;

    try {
      verified = await verifyTelegramInitData(body.initData, c.env.TELEGRAM_BOT_TOKEN);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Invalid Telegram init data', 401, 'INVALID_INIT_DATA', {
        cause: error instanceof Error ? error.message : 'Unknown init data error',
      });
    }

    const userId = await app.userService.upsertTelegramUser(verified.user, body.timezone);
    const profile = await app.userService.getProfileSnapshot(userId, body.timezone);
    assertPhoneRegistered(profile.phoneNumber);
    const session = await signAppSession(c.env.APP_JWT_SECRET, {
      app_user_id: profile.userId,
      locale: profile.locale,
      phone_registered: Boolean(profile.phoneNumber),
      role: profile.role,
      telegram_user_id: profile.telegramUserId,
      theme: profile.themePreference,
    });
    const dashboard = await app.userService.buildDashboard(userId, profile.timezone);

    return c.json({
      dashboard,
      profile,
      session,
    });
  });

  api.use('/v1/*', bearerAuth);
  api.use('/v1/admin/*', adminOnly);

  api.get('/v1/bootstrap', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const profile = await app.userService.getProfileSnapshot(session.app_user_id, 'Asia/Tashkent');
    assertPhoneRegistered(profile.phoneNumber);
    const dashboard = await app.userService.buildDashboard(session.app_user_id, profile.timezone);
    return c.json({ dashboard, profile });
  });

  api.post('/v1/intents/parse', async (c) => {
    const app = c.get('app');
    const payload = parseCommandSchema.parse(await c.req.json());
    const parsed = app.nlu.parse(payload.text, {
      defaultCurrency: payload.defaultCurrency,
      locale: payload.locale,
      now: payload.nowIso ? new Date(payload.nowIso) : undefined,
      timeZone: payload.timezone,
    });

    return c.json(parsed);
  });

  api.post('/v1/plans', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const payload = createPlanSchema.parse(await c.req.json());
    await app.quotaService.assertMetricAvailable(session.app_user_id, 'plan_create', payload.timezone);
    const created = await app.planService.create(session.app_user_id, session.locale, payload);
    return c.json({ created });
  });

  api.post('/v1/transactions', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const payload = createTransactionSchema.parse(await c.req.json());
    await app.quotaService.assertMetricAvailable(session.app_user_id, 'finance_entry_create', 'Asia/Tashkent');
    const created = await app.financeService.createTransaction(session.app_user_id, session.locale, payload);
    return c.json({ created });
  });

  api.post('/v1/debts', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const payload = createDebtSchema.parse(await c.req.json());
    await app.quotaService.assertPremiumFeature(session.app_user_id, 'debt.management');
    const created = await app.financeService.createDebt(session.app_user_id, session.locale, payload);
    return c.json({ created });
  });

  api.post('/v1/debts/payments', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const payload = createDebtPaymentSchema.parse(await c.req.json());
    await app.quotaService.assertPremiumFeature(session.app_user_id, 'debt.management');
    await app.financeService.createDebtPayment(session.app_user_id, payload);
    return c.json({ ok: true });
  });

  api.post('/v1/limits', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const payload = createCategoryLimitSchema.parse(await c.req.json());
    await app.quotaService.assertPremiumFeature(session.app_user_id, 'finance.limits');
    await app.financeService.createCategoryLimit(session.app_user_id, payload);
    return c.json({ ok: true });
  });

  api.get('/v1/finance/summary', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const month = c.req.query('month') ?? new Date().toISOString().slice(0, 7) + '-01';
    const items = await app.financeService.buildMonthlySummary(session.app_user_id, month);
    return c.json({ items });
  });

  api.get('/v1/calendar', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const month = c.req.query('month') ?? new Date().toISOString().slice(0, 7) + '-01';
    return c.json(await app.userService.buildCalendarMonth(session.app_user_id, month));
  });

  api.patch('/v1/profile', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const payload = updateProfileSchema.parse(await c.req.json());
    await app.userService.updateProfile(session.app_user_id, payload);
    return c.json({ ok: true });
  });

  api.get('/v1/profile/notifications', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const settings = await app.userService.getNotificationSettings(session.app_user_id);
    return c.json({ settings });
  });

  api.patch('/v1/profile/notifications', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const payload = updateNotificationSettingsSchema.parse(await c.req.json());
    const settings = await app.userService.updateNotificationSettings(session.app_user_id, payload);
    return c.json({ settings });
  });

  api.get('/v1/categories', async (c) => {
    const app = c.get('app');
    const session = c.get('session');
    const categories = await app.userService.listCategories(session.app_user_id);
    return c.json({ categories });
  });

  api.get('/v1/admin/overview', async (c) => {
    const app = c.get('app');
    return c.json(await app.adminService.overview());
  });

  api.post('/v1/admin/subscriptions/grant', async (c) => {
    const app = c.get('app');
    const session = c.get('session');

    const payload = adminGrantPremiumSchema.parse(await c.req.json());
    const targetUserId = payload.targetUserId
      ?? (payload.targetTelegramUserId
        ? (await app.userService.findByTelegramUserId(payload.targetTelegramUserId)).id
        : null);

    if (!targetUserId) {
      throw new AppError('Target user not found', 404, 'TARGET_USER_NOT_FOUND');
    }

    const result = await app.adminService.grantPremium(targetUserId, session.app_user_id, payload.months);
    return c.json({ result });
  });

  return api;
}
