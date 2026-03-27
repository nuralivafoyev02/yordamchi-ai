import { miniAppKeyboard } from '../bot/keyboards/common';
import type { AppContext } from '../core/app-context';

export async function dispatchReminders(app: AppContext) {
  const reminders = await app.reminderService.claimBatch(crypto.randomUUID(), 30);

  for (const reminder of reminders) {
    try {
      const user = await app.userService.getProfileSnapshot(reminder.user_id, 'Asia/Tashkent');
      await app.telegram.sendMessage(
        user.telegramUserId,
        `<b>${reminder.title}</b>\n${reminder.body}`,
        {
          parse_mode: 'HTML',
          reply_markup: miniAppKeyboard(user.locale, reminder.deep_link ?? app.env.TELEGRAM_MINIAPP_URL),
        },
      );
      await app.reminderService.markSent(reminder.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown reminder error';
      await app.reminderService.markFailed(reminder.id, message);
      await app.logService.botLog({
        context: {
          reminderId: reminder.id,
        },
        event: 'reminder_dispatch_failed',
        level: 'error',
        message,
        userId: reminder.user_id,
      });
    }
  }

  return reminders.length;
}
