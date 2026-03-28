import { miniAppKeyboard } from '../keyboards/common';
import { helpMessage, openHintMessage, startMessage, summaryMessage } from '../messages/formatter';
import { hasRegisteredPhone, promptPhoneRegistration, resolveTelegramUserContext } from './registration';
import type { AppContext } from '../../core/app-context';
import type { TelegramMessage } from '../../core/telegram/types';

export async function handleCommand(app: AppContext, message: TelegramMessage) {
  const chatId = message.chat.id;
  const command = message.text?.split(' ')[0] ?? '';
  const context = await resolveTelegramUserContext(app, message);

  if (!context) {
    return;
  }

  if (!hasRegisteredPhone(context.profile)) {
    await promptPhoneRegistration(app, chatId, context.locale, context.userId);
    return;
  }

  if (command === '/start') {
    await app.logService.botLog({
      channelLevel: 'INFO',
      context: {
        command: '/start',
        telegramUserId: message.from?.id ?? null,
        username: message.from?.username ?? null,
      },
      event: 'bot_start',
      level: 'info',
      message: 'User /start bosdi',
      userId: context.userId,
    });
    await app.telegram.sendMessage(chatId, startMessage(context.locale), {
      reply_markup: miniAppKeyboard(context.locale, app.env.TELEGRAM_MINIAPP_URL),
    });
    return;
  }

  if (command === '/help') {
    await app.telegram.sendMessage(chatId, helpMessage(context.locale), {
      reply_markup: miniAppKeyboard(context.locale, app.env.TELEGRAM_MINIAPP_URL),
    });
    return;
  }

  if (command === '/app') {
    await app.telegram.sendMessage(chatId, openHintMessage(context.locale), {
      reply_markup: miniAppKeyboard(context.locale, app.env.TELEGRAM_MINIAPP_URL),
    });
    return;
  }

  if (command === '/summary' && message.from) {
    const user = await app.userService.findByTelegramUserId(message.from.id);
    const dashboard = await app.userService.buildDashboard(user.id, user.timezone ?? 'UTC');
    await app.telegram.sendMessage(
      chatId,
      summaryMessage(context.locale, {
        accounts: dashboard.accounts.length,
        debts: dashboard.openDebts.length,
        plans: dashboard.upcomingPlans.length,
      }),
      { reply_markup: miniAppKeyboard(context.locale, app.env.TELEGRAM_MINIAPP_URL) },
    );
    return;
  }

  await app.telegram.sendMessage(chatId, startMessage(context.locale), {
    reply_markup: miniAppKeyboard(context.locale, app.env.TELEGRAM_MINIAPP_URL),
  });
}
