<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AppLocale } from '@yordamchi/shared';
import { useSessionStore } from './app/stores/session';
import { useUiStore } from './app/stores/ui';
import AppToast from './components/ui/AppToast.vue';
import BaseEmptyState from './shared/components/BaseEmptyState.vue';
import BaseTabs from './shared/components/BaseTabs.vue';
import PhoneRegistrationGate from './widgets/phone-registration-gate/PhoneRegistrationGate.vue';
import { getTelegramUserLocale, markTelegramReady } from './shared/lib/telegram';

const sessionStore = useSessionStore();
const uiStore = useUiStore();
const route = useRoute();
const router = useRouter();
const isAdmin = computed(() => ['admin', 'owner'].includes(sessionStore.profile?.role ?? 'user'));

const tabs = computed<Array<{ icon: 'admin' | 'finance' | 'home' | 'profile'; label: string; to: string }>>(() => {
  const baseTabs: Array<{ icon: 'admin' | 'finance' | 'home' | 'profile'; label: string; to: string }> = [
    { icon: 'home' as const, label: uiStore.text('tabs.home'), to: '/' },
    { icon: 'finance' as const, label: uiStore.text('tabs.finance'), to: '/finance' },
    { icon: 'profile' as const, label: uiStore.text('tabs.profile'), to: '/profile' },
  ];

  if (isAdmin.value) {
    baseTabs.push({ icon: 'admin' as const, label: uiStore.text('tabs.admin'), to: '/admin' });
  }

  return baseTabs;
});
const showBlockingState = computed(() => Boolean(sessionStore.error && !sessionStore.profile));
const showPhoneGate = computed(() => sessionStore.errorCode === 'PHONE_REGISTRATION_REQUIRED' && !sessionStore.profile);

onMounted(async () => {
  const initialLocale = getTelegramUserLocale() ?? 'uz';
  uiStore.setLocale(initialLocale);

  await sessionStore.bootstrap();
  uiStore.setLocale((sessionStore.profile?.locale as AppLocale | undefined) ?? initialLocale);
  uiStore.applyTheme(sessionStore.profile?.themePreference ?? 'blue');
  markTelegramReady();

  const deepLinkTab = route.query.tab;
  if (typeof deepLinkTab === 'string') {
    const target = deepLinkTab === 'finance'
      ? '/finance'
      : deepLinkTab === 'profile'
        ? '/profile'
        : deepLinkTab === 'admin'
          ? (isAdmin.value ? '/admin' : '/profile')
          : '/';
    await router.replace(target);
    return;
  }

  if (route.path === '/admin' && !isAdmin.value) {
    await router.replace('/profile');
  }
});
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__backdrop">
      <span class="app-shell__orb app-shell__orb--warm" />
      <span class="app-shell__orb app-shell__orb--cool" />
    </div>

    <main class="app-shell__content">
      <PhoneRegistrationGate
        v-if="showPhoneGate"
        @retry="sessionStore.retryBootstrap()"
      />
      <BaseEmptyState
        v-else-if="showBlockingState"
        :description="sessionStore.error ?? ''"
        :title="uiStore.text('errors.generic')"
      />
      <router-view v-else v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>

    <BaseTabs v-if="!showBlockingState" :items="tabs" />
    <AppToast />
  </div>
</template>

<style scoped>
.app-shell {
  background: var(--shell-gradient);
  min-height: 100dvh;
  overflow-x: hidden;
  padding: calc(var(--safe-top) + 12px) 14px 0;
  position: relative;
}

.app-shell__backdrop {
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  position: absolute;
}

.app-shell__orb {
  border-radius: 999px;
  filter: blur(72px);
  opacity: 0.36;
  position: absolute;
}

.app-shell__orb--warm {
  background: color-mix(in srgb, var(--hero-glow) 60%, transparent);
  height: 220px;
  right: -72px;
  top: 28px;
  width: 220px;
}

.app-shell__orb--cool {
  background: rgba(85, 166, 255, 0.18);
  height: 180px;
  left: -76px;
  top: 180px;
  width: 180px;
}

.app-shell__content {
  backdrop-filter: blur(2px);
  min-height: 100dvh;
  margin: 0 auto;
  max-width: 430px;
  padding-bottom: calc(var(--safe-bottom) + var(--nav-height) + 20px);
  position: relative;
  z-index: 1;
}
</style>
