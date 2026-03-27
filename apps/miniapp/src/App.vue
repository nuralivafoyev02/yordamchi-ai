<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from './app/stores/session';
import { useUiStore } from './app/stores/ui';
import BaseTabs from './shared/components/BaseTabs.vue';
import { markTelegramReady } from './shared/lib/telegram';

const sessionStore = useSessionStore();
const uiStore = useUiStore();
const route = useRoute();
const router = useRouter();

const tabs = computed(() => [
  { label: uiStore.text('tabs.home'), to: '/' },
  { label: uiStore.text('tabs.finance'), to: '/finance' },
  { label: uiStore.text('tabs.profile'), to: '/profile' },
]);

onMounted(async () => {
  await sessionStore.bootstrap();
  uiStore.setLocale((sessionStore.profile?.locale as 'uz' | 'en' | 'ru' | undefined) ?? 'uz');
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
    <div class="app-shell__glow app-shell__glow--top" />
    <div class="app-shell__glow app-shell__glow--bottom" />

    <main class="app-shell__content">
      <router-view />
    </main>

    <BaseTabs :items="tabs" />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 18px 18px 110px;
  position: relative;
}

.app-shell__content {
  margin: 0 auto;
  max-width: 760px;
  position: relative;
  z-index: 2;
}

.app-shell__glow {
  filter: blur(48px);
  opacity: 0.7;
  position: fixed;
  z-index: 0;
}

.app-shell__glow--top {
  background: linear-gradient(135deg, rgba(33, 119, 255, 0.24), rgba(79, 179, 255, 0));
  height: 240px;
  left: -30px;
  top: -80px;
  width: 240px;
}

.app-shell__glow--bottom {
  background: linear-gradient(135deg, rgba(255, 188, 58, 0.26), rgba(255, 210, 96, 0));
  bottom: -120px;
  height: 240px;
  right: -40px;
  width: 240px;
}
</style>
