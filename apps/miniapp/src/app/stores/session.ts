import { t, type AppLocale, type DashboardSnapshot, type SessionBootstrapResponse, type SessionExchangeResponse, type UserProfileSnapshot } from '@yordamchi/shared';
import { defineStore } from 'pinia';
import { ApiRequestError, apiClient } from '../../shared/api/client';
import { waitForTelegramInitData } from '../../shared/lib/telegram';
import { env } from '../../shared/config/env';

interface SessionState {
  bootstrapLoaded: boolean;
  dashboard: DashboardSnapshot | null;
  error: string | null;
  errorCode: string | null;
  profile: UserProfileSnapshot | null;
  token: string | null;
}

export const useSessionStore = defineStore('session', {
  actions: {
    async bootstrap() {
      if (this.bootstrapLoaded) {
        return;
      }

      try {
        const existingToken = window.localStorage.getItem('yordamchi-token');

        if (existingToken) {
          try {
            this.token = existingToken;
            apiClient.setToken(existingToken);
            const response = await apiClient.get<SessionBootstrapResponse>('/api/v1/bootstrap');
            this.dashboard = response.dashboard;
            this.profile = response.profile;
            this.error = null;
            this.errorCode = null;
            this.bootstrapLoaded = true;
            return;
          } catch {
            this.token = null;
            apiClient.setToken(null);
            window.localStorage.removeItem('yordamchi-token');
          }
        }

        const initData = (await waitForTelegramInitData()) || env.devInitData;

        if (!initData) {
          this.error = 'Telegram session topilmadi. Mini Appni Telegram ichidan qayta oching.';
          this.bootstrapLoaded = true;
          return;
        }

        const response = await apiClient.post<SessionExchangeResponse>('/api/v1/session/exchange', {
          initData,
          timezone: 'Asia/Tashkent',
        });

        this.token = response.session.token;
        this.dashboard = response.dashboard;
        this.profile = response.profile;
        this.error = null;
        this.errorCode = null;
        apiClient.setToken(response.session.token);
        window.localStorage.setItem('yordamchi-token', response.session.token);
        this.bootstrapLoaded = true;
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === 'PHONE_REGISTRATION_REQUIRED') {
          this.error = t('uz' as AppLocale, 'bot.phoneRequired');
          this.errorCode = error.code;
        } else {
          this.error = error instanceof ApiRequestError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Failed to bootstrap session';
          this.errorCode = error instanceof ApiRequestError ? error.code ?? null : null;
        }
        this.bootstrapLoaded = true;
      }
    },
    async retryBootstrap() {
      this.bootstrapLoaded = false;
      this.error = null;
      this.errorCode = null;
      this.profile = null;
      this.dashboard = null;
      this.token = null;
      apiClient.setToken(null);
      window.localStorage.removeItem('yordamchi-token');
      await this.bootstrap();
    },
    async refreshBootstrap() {
      if (!this.token) {
        return;
      }

      apiClient.setToken(this.token);
      const response = await apiClient.get<SessionBootstrapResponse>('/api/v1/bootstrap');
      this.dashboard = response.dashboard;
      this.profile = response.profile;
    },
    setProfilePatch(patch: Partial<UserProfileSnapshot>) {
      if (!this.profile) {
        return;
      }

      this.profile = {
        ...this.profile,
        ...patch,
      };
    },
  },
  state: (): SessionState => ({
    bootstrapLoaded: false,
    dashboard: null,
    error: null,
    errorCode: null,
    profile: null,
    token: null,
  }),
});
