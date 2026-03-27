import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTelegramInitData, getTelegramUserLocale, markTelegramReady, waitForTelegramInitData } from './telegram';

const testWindow = globalThis as typeof globalThis & {
  window?: Window & typeof globalThis;
};

describe('telegram helpers', () => {
  afterEach(() => {
    if (testWindow.window) {
      delete testWindow.window.Telegram;
    }
  });

  it('reads initData from Telegram WebApp', () => {
    testWindow.window = testWindow as Window & typeof globalThis;
    testWindow.window.Telegram = {
      WebApp: {
        initData: 'tg-init-data',
        initDataUnsafe: {
          user: {
            language_code: 'ru',
          },
        },
      },
    };

    expect(getTelegramInitData()).toBe('tg-init-data');
    expect(getTelegramUserLocale()).toBe('ru');
  });

  it('waits until initData appears', async () => {
    vi.useFakeTimers();
    testWindow.window = testWindow as Window & typeof globalThis;
    testWindow.window.Telegram = {
      WebApp: {},
    };

    const pending = waitForTelegramInitData(250);

    setTimeout(() => {
      if (testWindow.window?.Telegram?.WebApp) {
        testWindow.window.Telegram.WebApp.initData = 'late-init-data';
      }
    }, 100);

    await vi.advanceTimersByTimeAsync(120);
    await expect(pending).resolves.toBe('late-init-data');
    vi.useRealTimers();
  });

  it('calls Telegram ready when available', () => {
    const ready = vi.fn();
    const expand = vi.fn();
    testWindow.window = testWindow as Window & typeof globalThis;
    testWindow.window.Telegram = {
      WebApp: {
        expand,
        ready,
      },
    };

    markTelegramReady();

    expect(expand).toHaveBeenCalledTimes(1);
    expect(ready).toHaveBeenCalledTimes(1);
  });
});
