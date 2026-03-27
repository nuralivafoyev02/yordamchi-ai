import { t, type AppLocale } from '@yordamchi/shared';
import { miniAppKeyboard } from '../keyboards/common';
import { helpMessage } from '../messages/formatter';
import type { AppContext } from '../../core/app-context';
import type { TelegramMessage } from '../../core/telegram/types';

export async function handleCommand(app: AppContext, message: TelegramMessage, locale: AppLocale) {
  const chatId = message.chat.id;
  const command = message.text?.split(' ')[0] ?? '';

  if (command === '/start' || command === '/help') {
    await app.telegram.sendMessage(chatId, helpMessage(locale), {
      parse_mode: 'HTML',
      reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
    });
    return;
  }

  if (command === '/app') {
    await app.telegram.sendMessage(chatId, t(locale, 'common.openMiniApp'), {
      reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
    });
    return;
  }

  if (command === '/summary' && message.from) {
    const user = await app.userService.findByTelegramUserId(message.from.id);
    const dashboard = await app.userService.buildDashboard(user.id, user.timezone ?? 'Asia/Tashkent');
    await app.telegram.sendMessage(
      chatId,
      `<b>${t(locale, 'tabs.home')}</b>\nPlans: ${dashboard.upcomingPlans.length}\nDebts: ${dashboard.openDebts.length}\nAccounts: ${dashboard.accounts.length}`,
      { parse_mode: 'HTML', reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL) },
    );
    return;
  }

  await app.telegram.sendMessage(chatId, helpMessage(locale), {
    parse_mode: 'HTML',
    reply_markup: miniAppKeyboard(app.env.TELEGRAM_MINIAPP_URL),
  });
}
