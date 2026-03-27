<script setup lang="ts">
import { useText } from '../../shared/composables/useText';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';

defineProps<{
  isPremium: boolean;
  theme: 'blue' | 'gold';
}>();

const emit = defineEmits<{
  select: [theme: 'blue' | 'gold'];
  upgrade: [];
}>();

const { text } = useText();
</script>

<template>
  <BaseCard class="theme-card">
    <div class="theme-card__head">
      <div>
        <p>{{ text('profile.colorStyle') }}</p>
        <h3>{{ text('profile.chooseAccent') }}</h3>
      </div>
    </div>

    <div class="theme-grid">
      <button :class="['theme-option', { 'theme-option--active': theme === 'blue' }]" type="button" @click="emit('select', 'blue')">
        <i class="theme-option__swatch theme-option__swatch--classic" />
        <span>{{ text('profile.classicStyle') }}</span>
        <small>{{ text('profile.neutralAccent') }}</small>
      </button>
      <button
        :class="['theme-option', 'theme-option--gold', { 'theme-option--active': theme === 'gold' }]"
        type="button"
        @click="emit('select', 'gold')"
      >
        <i class="theme-option__swatch theme-option__swatch--gold" />
        <span>{{ text('premium.goldTheme') }}</span>
        <small>{{ text('profile.goldAccent') }}</small>
        <StatusBadge v-if="!isPremium" tone="premium">{{ text('common.premium') }}</StatusBadge>
      </button>
    </div>
    <BaseButton v-if="!isPremium" block variant="secondary" @click="emit('upgrade')">{{ text('premium.cta') }}</BaseButton>
  </BaseCard>
</template>

<style scoped>
.theme-card {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.theme-card__head p {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0 0 6px;
}

.theme-card__head h3 {
  font-family: var(--font-display);
  font-size: 18px;
  margin: 0;
}

.theme-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}

.theme-option {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: grid;
  gap: 6px;
  min-height: 92px;
  padding: 12px;
  text-align: left;
}

.theme-option--gold {
  border-color: rgba(240, 193, 82, 0.24);
}

.theme-option--active {
  border-color: rgba(240, 193, 82, 0.4);
  box-shadow: inset 0 0 0 1px rgba(240, 193, 82, 0.3);
}

.theme-option > span {
  font-family: var(--font-display);
  font-size: 15px;
}

.theme-option > small {
  color: var(--text-muted);
  font-size: 12px;
}

.theme-option__swatch {
  border-radius: 999px;
  display: inline-block;
  height: 28px;
  width: 28px;
}

.theme-option__swatch--classic {
  background: linear-gradient(135deg, #d8dde7, #7d879a);
}

.theme-option__swatch--gold {
  background: linear-gradient(135deg, #ffd56e, #f09b5a);
}

.theme-card :deep(.badge) {
  justify-self: start;
}

.theme-card :deep(.button) {
  min-height: 38px;
}
</style>
