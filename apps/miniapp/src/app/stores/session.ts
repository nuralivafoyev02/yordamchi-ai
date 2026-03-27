import { defineStore } from 'pinia';
import { apiClient } from '../../shared/api/client';
import { getTelegramInitData } from '../../shared/lib/telegram';
import { env } from '../../shared/config/env';

interface SessionState {
  bootstrapLoaded: boolean;
  dashboard: Record<string, unknown> | null;
  error: string | null;
  profile: Record<string, unknown> | null;
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
          this.token = existingToken;
          apiClient.setToken(existingToken);
          const response = await apiClient.get('/api/v1/bootstrap');
          this.dashboard = response.dashboard;
          this.profile = response.profile;
          this.bootstrapLoaded = true;
          return;
        }

        const initData = getTelegramInitData() || env.devInitData;

        if (!initData) {
          this.error = 'Telegram init data is missing. Set VITE_DEV_INIT_DATA for local preview.';
          this.bootstrapLoaded = true;
          return;
        }

        const response = await apiClient.post('/api/v1/session/exchange', {
          initData,
          timezone: 'Asia/Tashkent',
        });

        this.token = response.session.token;
        this.dashboard = response.dashboard;
        this.profile = response.profile;
        apiClient.setToken(response.session.token);
        window.localStorage.setItem('yordamchi-token', response.session.token);
        this.bootstrapLoaded = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to bootstrap session';
        this.bootstrapLoaded = true;
      }
    },
    async refreshBootstrap() {
      if (!this.token) {
        return;
      }

      apiClient.setToken(this.token);
      const response = await apiClient.get('/api/v1/bootstrap');
      this.dashboard = response.dashboard;
      this.profile = response.profile;
    },
    setProfilePatch(patch: Record<string, unknown>) {
      this.profile = {
        ...(this.profile ?? {}),
        ...patch,
      };
    },
  },
  state: (): SessionState => ({
    bootstrapLoaded: false,
    dashboard: null,
    error: null,
    profile: null,
    token: null,
  }),
});
