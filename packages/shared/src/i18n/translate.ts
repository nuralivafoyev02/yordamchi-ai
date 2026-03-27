import type { AppLocale } from '../domain/enums';
import { messages } from './messages';

function resolvePath(tree: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.');
  let cursor: unknown = tree;

  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || !(part in cursor)) {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[part];
  }

  return typeof cursor === 'string' ? cursor : undefined;
}

export function t(locale: AppLocale, key: string, params?: Record<string, string | number>): string {
  const fallback =
    resolvePath(messages[locale] as Record<string, unknown>, key) ??
    resolvePath(messages.en as Record<string, unknown>, key) ??
    key;

  if (!params) {
    return fallback;
  }

  return Object.entries(params).reduce((text, [paramKey, paramValue]) => {
    return text.replaceAll(`{${paramKey}}`, String(paramValue));
  }, fallback);
}
