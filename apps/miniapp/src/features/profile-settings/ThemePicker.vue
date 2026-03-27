<script setup lang="ts">
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';

defineProps<{
  isPremium: boolean;
  theme: 'blue' | 'gold';
}>();

const emit = defineEmits<{
  select: [theme: 'blue' | 'gold'];
}>();
</script>

<template>
  <BaseCard>
    <div class="theme-grid">
      <button :class="['theme-option', { 'theme-option--active': theme === 'blue' }]" type="button" @click="emit('select', 'blue')">
        <span>Blue</span>
      </button>
      <button
        :class="['theme-option', 'theme-option--gold', { 'theme-option--active': theme === 'gold' }]"
        type="button"
        @click="emit('select', 'gold')"
      >
        <span>Gold</span>
        <StatusBadge v-if="!isPremium" tone="premium">Premium</StatusBadge>
      </button>
    </div>
    <BaseButton v-if="!isPremium" block variant="secondary">Unlock Gold Theme</BaseButton>
  </BaseCard>
</template>

<style scoped>
.theme-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
  margin-bottom: 14px;
}

.theme-option {
  background: linear-gradient(135deg, rgba(31, 114, 255, 0.18), rgba(31, 114, 255, 0.05));
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  display: grid;
  gap: 8px;
  min-height: 112px;
  padding: 16px;
  text-align: left;
}

.theme-option--gold {
  background: linear-gradient(135deg, rgba(235, 188, 72, 0.22), rgba(255, 244, 217, 0.45));
}

.theme-option--active {
  border-color: var(--accent);
}

span {
  font-family: var(--font-display);
  font-size: 18px;
}
</style>
