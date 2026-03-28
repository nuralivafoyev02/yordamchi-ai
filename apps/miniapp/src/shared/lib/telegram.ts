import type { AppLocale } from '@yordamchi/shared';

let viewportLocked = false;

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        close?: () => void;
        disableVerticalSwipes?: () => void;
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

export function resolveTelegramTimeZone(fallback = 'UTC') {
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (typeof browserTimeZone === 'string' && browserTimeZone.trim().length > 0) {
    return browserTimeZone;
  }

  return fallback;
}

function shouldApplyTouchViewportLock() {
  if (typeof window === 'undefined') {
    return false;
  }

  const coarseTouchDevice = window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ?? false;
  return coarseTouchDevice || (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024);
}

export function lockMiniAppViewport() {
  if (viewportLocked || typeof document === 'undefined' || !shouldApplyTouchViewportLock()) {
    return;
  }

  viewportLocked = true;

  const preventGestureZoom = (event: Event) => {
    event.preventDefault();
  };

  const preventPinchZoom = (event: TouchEvent) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  };

  let lastTouchEndAt = 0;
  const preventDoubleTapZoom = (event: TouchEvent) => {
    const now = Date.now();

    if (now - lastTouchEndAt < 320) {
      event.preventDefault();
    }

    lastTouchEndAt = now;
  };

  document.addEventListener('gesturestart', preventGestureZoom, { passive: false });
  document.addEventListener('gesturechange', preventGestureZoom, { passive: false });
  document.addEventListener('touchmove', preventPinchZoom, { passive: false });
  document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
}

export function markTelegramReady() {
  lockMiniAppViewport();

  if (shouldApplyTouchViewportLock()) {
    window.Telegram?.WebApp?.disableVerticalSwipes?.();
  }

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
