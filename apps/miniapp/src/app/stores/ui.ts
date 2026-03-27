import { defineStore } from 'pinia';
import type { AppLocale, ThemeKey } from '@yordamchi/shared';
import { t } from '@yordamchi/shared';

interface UiState {
  locale: AppLocale;
  theme: ThemeKey;
}

export const useUiStore = defineStore('ui', {
  actions: {
    applyTheme(theme: ThemeKey) {
      this.theme = theme;
      document.documentElement.dataset.theme = theme;
    },
    setLocale(locale: AppLocale) {
      this.locale = locale;
      document.documentElement.lang = locale;
    },
    text(key: string, params?: Record<string, string | number>) {
      return t(this.locale, key, params);
    },
  },
  state: (): UiState => ({
    locale: 'uz',
    theme: 'blue',
  }),
});
