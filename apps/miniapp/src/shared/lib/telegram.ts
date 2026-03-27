declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
      };
    };
  }
}

export function getTelegramInitData(): string | null {
  return window.Telegram?.WebApp?.initData ?? null;
}

export function markTelegramReady() {
  window.Telegram?.WebApp?.ready?.();
}
