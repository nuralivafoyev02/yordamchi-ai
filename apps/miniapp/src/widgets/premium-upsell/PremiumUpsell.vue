<script setup lang="ts">
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import { useText } from '../../shared/composables/useText';

defineEmits<{
  cta: [];
}>();

const { text } = useText();
</script>

<template>
  <BaseCard class="upsell">
    <p>{{ text('premium.lockedTitle') }}</p>
    <h3>{{ text('premium.goldTheme') }}</h3>
    <span>{{ text('premium.lockedBody') }}</span>
    <BaseButton block @click="$emit('cta')">{{ text('premium.cta') }}</BaseButton>
  </BaseCard>
</template>

<style scoped>
.upsell {
  border-color: rgba(var(--accent-rgb), 0.22);
  display: grid;
  gap: 6px;
}

p,
span {
  color: var(--tg-hint);
  font-size: var(--text-xs);
  margin: 0;
}

h3 {
  font-size: var(--text-lg);
  font-weight: var(--weight-interactive);
  margin: 0;
}

.upsell :deep(.button) {
  min-height: 38px;
}
</style>
