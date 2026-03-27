<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';
import { useText } from '../../shared/composables/useText';

const props = defineProps<{
  profile: Record<string, unknown> | null;
}>();

const { text } = useText();

const initial = computed(() => String(props.profile?.displayName ?? 'U').slice(0, 1).toUpperCase());
const handle = computed(() => {
  const username = String(props.profile?.username ?? '').trim();
  return username ? `@${username}` : text('profile.title');
});
const phone = computed(() => String(props.profile?.phoneNumber ?? '—'));
const telegramId = computed(() => String(props.profile?.telegramUserId ?? '—'));
const isPremium = computed(() => Boolean((props.profile?.subscription as Record<string, unknown> | undefined)?.isPremium));
</script>

<template>
  <BaseCard class="profile-hero">
    <div class="profile-hero__glow profile-hero__glow--gold" />
    <div class="profile-hero__glow profile-hero__glow--teal" />

    <div class="profile-hero__header">
      <h2>{{ text('tabs.profile') }}</h2>
    </div>

    <div class="profile-hero__center">
      <span class="profile-hero__avatar">{{ initial }}</span>
      <strong>{{ String(profile?.displayName ?? text('common.account')) }}</strong>
      <div class="profile-hero__meta">
        <div class="profile-hero__meta-line">
          <span>{{ handle }}</span>
          <i />
          <span>{{ phone }}</span>
        </div>
        <div class="profile-hero__meta-id">ID {{ telegramId }}</div>
      </div>
      <StatusBadge :tone="isPremium ? 'premium' : 'info'">
        {{ isPremium ? text('common.premium') : text('common.free') }}
      </StatusBadge>
    </div>
  </BaseCard>
</template>

<style scoped>
.profile-hero {
  min-height: 168px;
  overflow: hidden;
  padding: 14px 14px 16px;
  position: relative;
}

.profile-hero__glow {
  border-radius: 999px;
  filter: blur(56px);
  opacity: 0.26;
  position: absolute;
}

.profile-hero__glow--gold {
  background: color-mix(in srgb, var(--accent) 46%, transparent);
  height: 160px;
  left: -74px;
  top: 12px;
  width: 160px;
}

.profile-hero__glow--teal {
  background: color-mix(in srgb, var(--success) 30%, transparent);
  bottom: 8px;
  height: 150px;
  right: -70px;
  width: 150px;
}

.profile-hero__header,
.profile-hero__center {
  position: relative;
  z-index: 1;
}

.profile-hero__header h2 {
  font-size: var(--text-lg);
  font-weight: var(--weight-interactive);
  line-height: 1.1;
  margin: 0;
}

.profile-hero__center {
  align-items: center;
  display: grid;
  gap: 8px;
  justify-items: center;
  margin-top: 10px;
  text-align: center;
}

.profile-hero__avatar {
  align-items: center;
  border: 3px solid color-mix(in srgb, var(--accent) 32%, transparent);
  border-radius: 999px;
  color: var(--accent-strong);
  display: inline-flex;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  height: 62px;
  justify-content: center;
  width: 62px;
}

.profile-hero__center strong {
  font-size: clamp(16px, 4.6vw, 22px);
  font-weight: var(--weight-title);
  line-height: 1.15;
  max-width: 16ch;
}

.profile-hero__meta {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  border-radius: 16px;
  color: var(--accent-strong);
  display: grid;
  gap: 4px;
  justify-items: center;
  max-width: 100%;
  padding: 8px 12px;
  width: min(100%, 520px);
}

.profile-hero__meta-line {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  font-weight: var(--weight-interactive);
  gap: 8px;
  justify-content: center;
  line-height: 1.35;
}

.profile-hero__meta-id {
  font-size: 11px;
  font-weight: var(--weight-interactive);
  line-height: 1.3;
}

.profile-hero__meta-line i {
  background: currentColor;
  border-radius: 999px;
  display: inline-block;
  height: 4px;
  opacity: 0.8;
  width: 4px;
}

.profile-hero :deep(.badge) {
  font-size: 10px;
  padding: 3px 8px;
}

@media (max-width: 420px) {
  .profile-hero {
    padding-inline: 16px;
  }

  .profile-hero__meta-line {
    gap: 6px;
  }
}
</style>
