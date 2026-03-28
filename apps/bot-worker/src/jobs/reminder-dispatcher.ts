import { t } from '@yordamchi/shared';
import { miniAppKeyboard } from '../bot/keyboards/common';
import { reminderMessage } from '../bot/messages/formatter';
import type { AppContext } from '../core/app-context';
import { getNextReminderWindow, isWithinQuietHours, reminderSettingEnabled } from './reminder-policy';

const genericReminderTitles = new Set(['Reminder', 'Напоминание', 'Eslatma']);
const STALE_PLAN_REMINDER_GRACE_MS = 30 * 60 * 1000;

export function resolveReminderTitle(locale: 'uz' | 'en' | 'ru', storedTitle?: string | null) {
  const normalizedTitle = storedTitle?.trim();

  if (!normalizedTitle || genericReminderTitles.has(normalizedTitle)) {
    return t(locale, 'bot.reminderDue');
  }

  return normalizedTitle;
}

export function isStalePlanReminder(reminder: { reminder_kind: string; scheduled_for: string }, now: Date) {
  if (reminder.reminder_kind !== 'plan_due') {
    return false;
  }

  const scheduledFor = new Date(reminder.scheduled_for);

  if (Number.isNaN(scheduledFor.getTime())) {
    return false;
  }

  return now.getTime() - scheduledFor.getTime() > STALE_PLAN_REMINDER_GRACE_MS;
}

export async function dispatchReminders(app: AppContext) {
  const reminders = await app.reminderService.claimBatch(crypto.randomUUID(), 30);

  for (const reminder of reminders) {
    try {
      const now = new Date();

      if (isStalePlanReminder(reminder, now)) {
        await app.reminderService.cancel(reminder.id, 'stale_plan_reminder_skipped');
        await app.logService.botLog({
          channelLevel: 'INFO',
          context: {
            reminderId: reminder.id,
            reminderKind: reminder.reminder_kind,
            scheduledFor: reminder.scheduled_for,
            staleByMinutes: Math.floor((now.getTime() - new Date(reminder.scheduled_for).getTime()) / 60_000),
          },
          event: 'reminder_skipped_stale_plan',
          level: 'info',
          message: 'Stale plan reminder skipped to avoid delayed notification floods.',
          userId: reminder.user_id,
        });
        continue;
      }

      const user = await app.userService.getProfileSnapshot(reminder.user_id, 'UTC');
      const settings = await app.userService.getNotificationSettings(reminder.user_id);

      if (!reminderSettingEnabled(reminder.reminder_kind, settings)) {
        await app.reminderService.cancel(reminder.id, 'notification_suppressed_by_settings');
        await app.logService.botLog({
          context: {
            reminderId: reminder.id,
            reminderKind: reminder.reminder_kind,
          },
          event: 'reminder_suppressed_by_settings',
          level: 'warn',
          message: 'Reminder skipped because notification settings disabled it.',
          userId: reminder.user_id,
        });
        continue;
      }

      const dispatchBaseTime = new Date(Math.max(now.getTime(), new Date(reminder.scheduled_for).getTime()));

      if (isWithinQuietHours(dispatchBaseTime, user.timezone, settings)) {
        const nextWindow = getNextReminderWindow(dispatchBaseTime, user.timezone, settings).toISOString();
        await app.reminderService.reschedule(reminder.id, nextWindow, 'quiet_hours_rescheduled');
        await app.logService.botLog({
          context: {
            nextWindow,
            reminderId: reminder.id,
            reminderKind: reminder.reminder_kind,
          },
          event: 'reminder_rescheduled_for_quiet_hours',
          level: 'info',
          message: 'Reminder rescheduled because user quiet hours are active.',
          userId: reminder.user_id,
        });
        continue;
      }

      const reminderTitle = resolveReminderTitle(user.locale, reminder.title);

      await app.telegram.sendMessage(
        user.telegramUserId,
        reminderMessage(user.locale, reminderTitle, reminder.body),
        {
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
