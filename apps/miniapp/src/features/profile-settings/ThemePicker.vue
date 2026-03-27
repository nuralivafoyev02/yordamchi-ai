<script setup lang="ts">
import type { ThemeKey } from '@yordamchi/shared';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';
import { useText } from '../../shared/composables/useText';

const props = defineProps<{
  isPremium: boolean;
  theme: ThemeKey;
}>();

const emit = defineEmits<{
  select: [theme: ThemeKey];
  upgrade: [];
}>();

const { text } = useText();

const premiumThemes = new Set<ThemeKey>(['gold', 'mint']);

const options: Array<{
  descriptionKey: string;
  isPremium: boolean;
  key: ThemeKey;
  labelKey: string;
  swatchClass: string;
}> = [
  {
    descriptionKey: 'profile.neutralAccent',
    isPremium: false,
    key: 'blue',
    labelKey: 'profile.classicStyle',
    swatchClass: 'theme-option__swatch--classic',
  },
  {
    descriptionKey: 'profile.graphiteAccent',
    isPremium: false,
    key: 'graphite',
    labelKey: 'profile.graphiteTheme',
    swatchClass: 'theme-option__swatch--graphite',
  },
  {
    descriptionKey: 'profile.goldAccent',
    isPremium: true,
    key: 'gold',
    labelKey: 'premium.goldTheme',
    swatchClass: 'theme-option__swatch--gold',
  },
  {
    descriptionKey: 'profile.mintAccent',
    isPremium: true,
    key: 'mint',
    labelKey: 'profile.mintTheme',
    swatchClass: 'theme-option__swatch--mint',
  },
];

function handleSelect(theme: ThemeKey) {
  if (premiumThemes.has(theme) && !props.isPremium) {
    emit('upgrade');
    return;
  }

  emit('select', theme);
}
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
      <button
        v-for="option in options"
        :key="option.key"
        :class="['theme-option', { 'theme-option--active': props.theme === option.key }]"
        type="button"
        @click="handleSelect(option.key)"
      >
        <i :class="['theme-option__swatch', option.swatchClass]" />
        <span>{{ text(option.labelKey) }}</span>
        <small>{{ text(option.descriptionKey) }}</small>
        <StatusBadge v-if="option.isPremium && !props.isPremium" tone="premium">{{ text('common.premium') }}</StatusBadge>
      </button>
    </div>

    <BaseButton v-if="!props.isPremium" block variant="secondary" @click="emit('upgrade')">{{ text('premium.cta') }}</BaseButton>
  </BaseCard>
</template>

<style scoped>
.theme-card {
  display: grid;
  gap: 10px;
}

.theme-card__head p {
  color: var(--text-muted);
  font-size: var(--text-section);
  letter-spacing: 0.12em;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.theme-card__head h3 {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  margin: 0;
}

.theme-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.theme-option {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)), var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  display: grid;
  gap: 4px;
  min-height: 98px;
  padding: 12px;
  text-align: left;
}

.theme-option--active {
  border-color: color-mix(in srgb, var(--accent) 36%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--accent) 24%, transparent),
    0 10px 24px rgba(0, 0, 0, 0.18);
}

.theme-option > span {
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
}

.theme-option > small {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.theme-option__swatch {
  border-radius: 999px;
  display: inline-block;
  height: 22px;
  width: 22px;
}

.theme-option__swatch--classic {
  background: linear-gradient(135deg, #ff4d6d, #ff8a5b);
}

.theme-option__swatch--graphite {
  background: linear-gradient(135deg, #6f7892, #a5adc4);
}

.theme-option__swatch--gold {
  background: linear-gradient(135deg, #f5c84c, #ff8a5b);
}

.theme-option__swatch--mint {
  background: linear-gradient(135deg, #18d97a, #35f0a1);
}

.theme-card :deep(.badge) {
  justify-self: start;
}
</style>
