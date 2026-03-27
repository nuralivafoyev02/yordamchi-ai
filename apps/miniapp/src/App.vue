<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AppLocale } from '@yordamchi/shared';
import { useSessionStore } from './app/stores/session';
import { useUiStore } from './app/stores/ui';
import BaseEmptyState from './shared/components/BaseEmptyState.vue';
import BaseTabs from './shared/components/BaseTabs.vue';
import PhoneRegistrationGate from './widgets/phone-registration-gate/PhoneRegistrationGate.vue';
import { markTelegramReady } from './shared/lib/telegram';

const sessionStore = useSessionStore();
const uiStore = useUiStore();
const route = useRoute();
const router = useRouter();

const tabs = computed(() => [
  { icon: 'home' as const, label: uiStore.text('tabs.home'), to: '/' },
  { icon: 'finance' as const, label: uiStore.text('tabs.finance'), to: '/finance' },
  { icon: 'profile' as const, label: uiStore.text('tabs.profile'), to: '/profile' },
]);
const showBlockingState = computed(() => Boolean(sessionStore.error && !sessionStore.profile));
const showPhoneGate = computed(() => sessionStore.errorCode === 'PHONE_REGISTRATION_REQUIRED' && !sessionStore.profile);

onMounted(async () => {
  uiStore.setLocale('uz');

  await sessionStore.bootstrap();
  uiStore.setLocale((sessionStore.profile?.locale as AppLocale | undefined) ?? 'uz');
  uiStore.applyTheme((sessionStore.profile?.themePreference as 'blue' | 'gold' | undefined) ?? 'blue');
  markTelegramReady();

  const deepLinkTab = route.query.tab;
  if (typeof deepLinkTab === 'string') {
    const target = deepLinkTab === 'finance' ? '/finance' : deepLinkTab === 'profile' ? '/profile' : '/';
    router.replace(target);
  }
});
</script>

<template>
  <div class="app-shell">
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
      <router-view v-else />
    </main>

    <BaseTabs v-if="!showBlockingState" :items="tabs" />
  </div>
</template>

<style scoped>
.app-shell {
  background: var(--bg);
  min-height: 100vh;
  padding: 16px 16px 108px;
  position: relative;
}

.app-shell__content {
  margin: 0 auto;
  max-width: 460px;
  position: relative;
  z-index: 1;
}
</style>
