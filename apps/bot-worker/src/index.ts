import { locales, t, type AppLocale } from '@yordamchi/shared';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import type { EnvBindings } from './core/config/env';
import { AppError } from './core/errors/app-error';
import { buildAppContext } from './core/app-context';
import type { TelegramUpdate } from './core/telegram/types';
import { handleCallback } from './bot/handlers/callbacks';
import { handleCommand } from './bot/handlers/commands';
import { miniAppKeyboard } from './bot/keyboards/common';
import { handleContactRegistration } from './bot/handlers/registration';
import { handleText } from './bot/handlers/text';
import { createApiRouter } from './api/routes';
import { dispatchReminders } from './jobs/reminder-dispatcher';
import type { AppSessionClaims } from './modules/auth/session';

type Variables = {
  app: ReturnType<typeof buildAppContext>;
  session: AppSessionClaims;
};

const app = new Hono<{ Bindings: EnvBindings; Variables: Variables }>();

function normalizeLocale(value?: string | null): AppLocale {
  return locales.includes(value as AppLocale) ? (value as AppLocale) : 'uz';
}

function healthPayload() {
  return {
    ok: true,
    service: 'yordamchi-ai-worker',
    timestamp: new Date().toISOString(),
  };
}

function buildErrorMeta(error: Error, c: Context<{ Bindings: EnvBindings; Variables: Variables }>) {
  return {
    path: c.req.path,
    method: c.req.method,
    stack: error.stack,
  };
}

function isZodError(error: unknown): error is Error & { issues?: Array<{ message?: string }> } {
  return error instanceof Error && error.name === 'ZodError';
}

async function resolveUpdateLocale(appContext: ReturnType<typeof buildAppContext>, update: TelegramUpdate): Promise<AppLocale> {
  const telegramUserId = update.message?.from?.id ?? update.callback_query?.from?.id;

  if (telegramUserId) {
    try {
      const user = await appContext.userService.findByTelegramUserId(telegramUserId);
      return normalizeLocale(user.language_code);
    } catch {
      return normalizeLocale(update.message?.from?.language_code?.slice(0, 2) ?? update.callback_query?.from?.language_code?.slice(0, 2));
    }
  }

  return 'uz';
}

app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('app', buildAppContext(c.env, requestId));
  await next();
});

app.use('/api/*', cors({
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400,
  origin: '*',
}));

app.onError((error, c) => {
  const appContext = c.get('app');
  const isAppError = error instanceof AppError;
  const isValidationError = isZodError(error);
  const meta = buildErrorMeta(error, c);
  const status = isAppError ? error.status : isValidationError ? 400 : 500;

  if ((isAppError && error.status < 500) || isValidationError) {
    appContext.logger.warn(error.message, {
      ...meta,
      code: isAppError ? error.code : 'VALIDATION_ERROR',
      details: isAppError ? error.details : { issues: error.issues },
      status,
    });
  } else {
    appContext.logger.error(error.message, meta);
  }

  c.status(status as never);
  return c.json({
    code: isAppError ? error.code : isValidationError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
    message: isAppError
      ? error.message
      : isValidationError
        ? error.issues?.[0]?.message ?? 'Validation error'
        : 'Unexpected error',
  });
});

app.get('/', (c) => c.json(healthPayload()));
app.get('/health', (c) => c.json(healthPayload()));

app.route('/api', createApiRouter());

app.post('/telegram/webhook', async (c) => {
  const appContext = c.get('app');
  const secretHeader = c.req.header('x-telegram-bot-api-secret-token');

  if (secretHeader !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    throw new AppError('Invalid webhook secret', 401, 'INVALID_WEBHOOK_SECRET');
  }

  const update = (await c.req.json()) as TelegramUpdate;

  try {
    if (update.message?.text?.startsWith('/')) {
      const locale = normalizeLocale(update.message.from?.language_code?.slice(0, 2));
      await handleCommand(appContext, update.message, locale);
    } else if (update.message?.contact) {
      await handleContactRegistration(appContext, update.message);
    } else if (update.message?.text) {
      await handleText(appContext, update.message);
    } else if (update.callback_query) {
      await handleCallback(appContext, update.callback_query);
    }
  } catch (error) {
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    const locale = await resolveUpdateLocale(appContext, update);
    if (chatId) {
      await appContext.telegram.sendMessage(chatId, t(locale, 'errors.generic'), {
        reply_markup: miniAppKeyboard(locale, c.env.TELEGRAM_MINIAPP_URL),
      });
    }

    await appContext.logService.botLog({
      context: {
        path: '/telegram/webhook',
      },
      event: 'telegram_update_failed',
      level: 'error',
      message: error instanceof Error ? error.message : 'Unknown Telegram handler error',
      telegramUpdateId: update.update_id,
    });
  }

  return c.json({ ok: true });
});

app.post('/internal/jobs/reminders', async (c) => {
  const appContext = c.get('app');
  const secret = c.req.header('x-internal-secret');

  if (secret !== c.env.INTERNAL_JOB_SECRET) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  const processed = await dispatchReminders(appContext);
  return c.json({ processed });
});

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: EnvBindings) => {
    const appContext = buildAppContext(env, crypto.randomUUID());
    await dispatchReminders(appContext);
  },
};
