<script setup lang="ts">
import { computed } from 'vue';
import type { AppLocale, ThemeKey } from '@yordamchi/shared';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import SectionHeader from '../../shared/components/SectionHeader.vue';
import { useText } from '../../shared/composables/useText';
import { useSessionStore } from '../../app/stores/session';
import { useUiStore } from '../../app/stores/ui';
import { apiClient } from '../../shared/api/client';
import NotificationToggleList from '../../features/notifications/NotificationToggleList.vue';
import ThemePicker from '../../features/profile-settings/ThemePicker.vue';
import ProfileSummary from '../../widgets/profile-summary/ProfileSummary.vue';
import PremiumUpsell from '../../widgets/premium-upsell/PremiumUpsell.vue';

const sessionStore = useSessionStore();
const uiStore = useUiStore();
const { text } = useText();

const profile = computed(() => (sessionStore.profile as Record<string, unknown>) ?? {});
const isPremium = computed(() => Boolean((profile.value.subscription as Record<string, unknown> | undefined)?.isPremium));

async function updateTheme(theme: ThemeKey) {
  if (theme === 'gold' && !isPremium.value) {
    return;
  }

  try {
    uiStore.applyTheme(theme);
    await apiClient.patch('/api/v1/profile', { themePreference: theme });
    sessionStore.setProfilePatch({ themePreference: theme });
  } catch {
    uiStore.applyTheme((profile.value.themePreference as ThemeKey | undefined) ?? 'blue');
  }
}

async function updateLocale(locale: AppLocale) {
  try {
    uiStore.setLocale(locale);
    await apiClient.patch('/api/v1/profile', { locale });
    sessionStore.setProfilePatch({ locale });
  } catch {
    uiStore.setLocale((profile.value.locale as AppLocale | undefined) ?? 'uz');
  }
}
</script>

<template>
  <div class="page">
    <ProfileSummary :profile="profile" />

    <ThemePicker :is-premium="isPremium" :theme="uiStore.theme" @select="updateTheme" />

    <BaseCard>
      <SectionHeader :subtitle="text('profile.locale')" :title="text('common.notifications')" />
      <div class="locale-grid">
        <BaseButton variant="secondary" @click="updateLocale('uz')">UZ</BaseButton>
        <BaseButton variant="secondary" @click="updateLocale('en')">EN</BaseButton>
        <BaseButton variant="secondary" @click="updateLocale('ru')">RU</BaseButton>
      </div>
      <NotificationToggleList />
    </BaseCard>

    <BaseCard>
      <SectionHeader :subtitle="text('profile.export')" :title="text('common.support')" />
      <BaseButton block variant="ghost">support@yordamchi.ai</BaseButton>
    </BaseCard>

    <PremiumUpsell v-if="!isPremium" />
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 18px;
}

.locale-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 16px;
}
</style>
