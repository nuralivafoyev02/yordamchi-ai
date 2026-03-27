import type { AppLocale } from '@yordamchi/shared';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        close?: () => void;
        expand?: () => void;
        initData?: string;
        initDataUnsafe?: {
          user?: {
            language_code?: string;
          };
        };
        ready?: () => void;
      };
    };
  }
}

export function getTelegramInitData(): string | null {
  return window.Telegram?.WebApp?.initData ?? null;
}

export async function waitForTelegramInitData(timeoutMs = 1500): Promise<string | null> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const initData = getTelegramInitData();
    if (initData) {
      return initData;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  return getTelegramInitData();
}

export function getTelegramUserLocale(): AppLocale | null {
  const locale = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code?.slice(0, 2);

  if (locale === 'uz' || locale === 'en' || locale === 'ru') {
    return locale;
  }

  return null;
}

export function markTelegramReady() {
  window.Telegram?.WebApp?.expand?.();
  window.Telegram?.WebApp?.ready?.();
}

export function closeTelegramWebApp() {
  if (window.Telegram?.WebApp?.close) {
    window.Telegram.WebApp.close();
    return;
  }

  window.history.back();
}
