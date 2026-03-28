import type { AppLocale, UserProfileSnapshot } from '@yordamchi/shared';
import { t } from '@yordamchi/shared';
import { miniAppKeyboard, phoneRegistrationKeyboard, removeKeyboard } from '../keyboards/common';
import { helpMessage } from '../messages/formatter';
import type { AppContext } from '../../core/app-context';
import { AppError } from '../../core/errors/app-error';
import type { TelegramMessage } from '../../core/telegram/types';

const DEFAULT_TIMEZONE = 'UTC';

export function hasRegisteredPhone(profile: UserProfileSnapshot) {
  return Boolean(profile.phoneNumber);
}

export async function resolveTelegramUserContext(app: AppContext, message: TelegramMessage) {
  if (!message.from) {
    return null;
  }

  const userId = await app.userService.upsertTelegramUser(message.from, DEFAULT_TIMEZONE);
  const profile = await app.userService.getProfileSnapshot(userId, DEFAULT_TIMEZONE);

  return {
    locale: profile.locale,
    profile,
    userId,
  };
}

export async function promptPhoneRegistration(app: AppContext, chatId: number, locale: AppLocale, userId: string, messageKey: string = 'bot.phoneRequired') {
  await app.stateService.setAwaitingPhone(userId);
  await app.telegram.sendMessage(chatId, t(locale, messageKey), {
    reply_markup: phoneRegistrationKeyboard(locale),
  });
}

export async function handleContactRegistration(app: AppContext, message: TelegramMessage) {
  if (!message.from || !message.contact) {
    return false;
  }

  const userId = await app.userService.upsertTelegramUser(message.from, DEFAULT_TIMEZONE);
  const profile = await app.userService.getProfileSnapshot(userId, DEFAULT_TIMEZONE);
  const locale = profile.locale;

  if (message.contact.user_id && message.contact.user_id !== message.from.id) {
    await promptPhoneRegistration(app, message.chat.id, locale, userId, 'bot.phoneOnlySelf');
    return true;
  }

  try {
    await app.userService.savePhoneNumber(userId, message.contact.phone_number);
  } catch (error) {
    if (error instanceof AppError && ['INVALID_PHONE_NUMBER', 'PHONE_ALREADY_USED'].includes(error.code)) {
      await promptPhoneRegistration(
        app,
        message.chat.id,
        locale,
        userId,
        error.code === 'PHONE_ALREADY_USED' ? 'bot.phoneAlreadyUsed' : 'bot.phoneInvalid',
      );
      return true;
    }

    throw error;
  }
  await app.stateService.clear(userId);
  await app.telegram.sendMessage(message.chat.id, t(locale, 'bot.phoneSaved'), {
    reply_markup: removeKeyboard(),
  });
  await app.telegram.sendMessage(message.chat.id, helpMessage(locale), {
    reply_markup: miniAppKeyboard(locale, app.env.TELEGRAM_MINIAPP_URL),
  });
  return true;
}
