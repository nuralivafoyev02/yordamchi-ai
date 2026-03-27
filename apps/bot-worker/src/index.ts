import { t } from '@yordamchi/shared';
import { Hono } from 'hono';
import type { EnvBindings } from './core/config/env';
import { AppError } from './core/errors/app-error';
import { buildAppContext } from './core/app-context';
import type { TelegramUpdate } from './core/telegram/types';
import { handleCallback } from './bot/handlers/callbacks';
import { handleCommand } from './bot/handlers/commands';
import { handleText } from './bot/handlers/text';
import { createApiRouter } from './api/routes';
import { dispatchReminders } from './jobs/reminder-dispatcher';
import type { AppSessionClaims } from './modules/auth/session';

type Variables = {
  app: ReturnType<typeof buildAppContext>;
  session: AppSessionClaims;
};

const app = new Hono<{ Bindings: EnvBindings; Variables: Variables }>();

function healthPayload() {
  return {
    ok: true,
    service: 'yordamchi-ai-worker',
    timestamp: new Date().toISOString(),
  };
}

app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('app', buildAppContext(c.env, requestId));
  await next();
});

app.onError((error, c) => {
  const appContext = c.get('app');
  const isAppError = error instanceof AppError;

  appContext.logger.error(error.message, {
    path: c.req.path,
    stack: error.stack,
  });

  return c.json(
    {
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      message: isAppError ? error.message : 'Unexpected error',
    },
    isAppError ? error.status : 500,
  );
});

app.get('/', (c) => c.json(healthPayload()));
app.get('/health', (c) => c.json(healthPayload()));

app.route('/', createApiRouter());

app.post('/telegram/webhook', async (c) => {
  const appContext = c.get('app');
  const secretHeader = c.req.header('x-telegram-bot-api-secret-token');

  if (secretHeader !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    throw new AppError('Invalid webhook secret', 401, 'INVALID_WEBHOOK_SECRET');
  }

  const update = (await c.req.json()) as TelegramUpdate;

  try {
    if (update.message?.text?.startsWith('/')) {
      const locale = (update.message.from?.language_code?.slice(0, 2) ?? 'uz') as 'uz' | 'en' | 'ru';
      await handleCommand(appContext, update.message, locale);
    } else if (update.message?.text) {
      await handleText(appContext, update.message);
    } else if (update.callback_query) {
      await handleCallback(appContext, update.callback_query);
    }
  } catch (error) {
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    const locale = (update.message?.from?.language_code?.slice(0, 2) ?? update.callback_query?.from?.language_code?.slice(0, 2) ?? 'uz') as 'uz' | 'en' | 'ru';
    if (chatId) {
      await appContext.telegram.sendMessage(chatId, t(locale, 'errors.generic'), {
        reply_markup: {
          inline_keyboard: [[{ text: 'Open Mini App', url: c.env.TELEGRAM_MINIAPP_URL }]],
        },
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
