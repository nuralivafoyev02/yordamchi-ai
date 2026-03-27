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
  gap: 8px;
  padding: 16px;
}

p,
span {
  color: var(--text-muted);
  font-size: 13px;
  margin: 0;
}

h3 {
  font-family: var(--font-display);
  font-size: 18px;
  margin: 0;
}

.upsell :deep(.button) {
  min-height: 38px;
}
</style>
