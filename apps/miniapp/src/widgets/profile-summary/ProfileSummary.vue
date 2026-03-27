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
  min-height: 216px;
  overflow: hidden;
  padding: 18px 18px 20px;
  position: relative;
}

.profile-hero__glow {
  border-radius: 999px;
  filter: blur(56px);
  opacity: 0.26;
  position: absolute;
}

.profile-hero__glow--gold {
  background: rgba(240, 193, 82, 0.5);
  height: 160px;
  left: -74px;
  top: 12px;
  width: 160px;
}

.profile-hero__glow--teal {
  background: rgba(26, 176, 143, 0.34);
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
  font-family: var(--font-display);
  font-size: 23px;
  line-height: 1.05;
  margin: 0;
}

.profile-hero__center {
  align-items: center;
  display: grid;
  gap: 10px;
  justify-items: center;
  margin-top: 14px;
  text-align: center;
}

.profile-hero__avatar {
  align-items: center;
  border: 3px solid rgba(240, 193, 82, 0.34);
  border-radius: 999px;
  color: #ffefb4;
  display: inline-flex;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  height: 82px;
  justify-content: center;
  width: 82px;
}

.profile-hero__center strong {
  font-family: var(--font-display);
  font-size: clamp(18px, 5vw, 28px);
  line-height: 1.1;
  max-width: 14ch;
}

.profile-hero__meta {
  background: rgba(70, 58, 31, 0.45);
  border: 1px solid rgba(240, 193, 82, 0.28);
  border-radius: 22px;
  color: #f5df9f;
  display: grid;
  gap: 4px;
  justify-items: center;
  max-width: 100%;
  padding: 10px 14px;
  width: min(100%, 520px);
}

.profile-hero__meta-line {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  font-size: 13px;
  font-weight: 600;
  gap: 8px;
  justify-content: center;
  line-height: 1.35;
}

.profile-hero__meta-id {
  font-size: 13px;
  font-weight: 600;
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
  font-size: 11px;
  padding: 5px 10px;
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
