<script setup lang="ts">
import BaseCard from '../../shared/components/BaseCard.vue';
import SectionHeader from '../../shared/components/SectionHeader.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';
import { useText } from '../../shared/composables/useText';

defineProps<{
  profile: Record<string, unknown> | null;
}>();

const { text } = useText();
</script>

<template>
  <BaseCard>
    <SectionHeader :subtitle="text('profile.title')" :title="String(profile?.displayName ?? 'User')" />

    <div class="profile-grid">
      <article>
        <span>{{ text('profile.premiumStatus') }}</span>
        <StatusBadge :tone="profile?.subscription && (profile.subscription as Record<string, unknown>).isPremium ? 'premium' : 'info'">
          {{ profile?.subscription && (profile.subscription as Record<string, unknown>).isPremium ? text('common.premium') : text('common.free') }}
        </StatusBadge>
      </article>

      <article>
        <span>{{ text('profile.activeTheme') }}</span>
        <strong>{{ profile?.themePreference }}</strong>
      </article>

      <article>
        <span>{{ text('profile.locale') }}</span>
        <strong>{{ profile?.locale }}</strong>
      </article>

      <article>
        <span>{{ text('profile.timezone') }}</span>
        <strong>{{ profile?.timezone }}</strong>
      </article>
    </div>
  </BaseCard>
</template>

<style scoped>
.profile-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, 1fr);
}

article {
  background: var(--surface-strong);
  border-radius: var(--radius-md);
  display: grid;
  gap: 8px;
  padding: 16px;
}

span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

strong {
  font-family: var(--font-display);
}
</style>
