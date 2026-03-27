<script setup lang="ts">
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import { useText } from '../../shared/composables/useText';

const { text } = useText();
</script>

<template>
  <BaseCard class="upsell">
    <p>{{ text('premium.lockedTitle') }}</p>
    <h3>{{ text('premium.goldTheme') }}</h3>
    <span>{{ text('premium.lockedBody') }}</span>
    <BaseButton block>{{ text('premium.cta') }}</BaseButton>
  </BaseCard>
</template>

<style scoped>
.upsell {
  background:
    radial-gradient(circle at top right, rgba(255, 208, 112, 0.24), transparent 32%),
    var(--surface);
  display: grid;
  gap: 10px;
}

p,
span {
  color: var(--text-muted);
  margin: 0;
}

h3 {
  font-family: var(--font-display);
  margin: 0;
}
</style>
