<script setup lang="ts">
defineProps<{
  subtitle?: string;
  title: string;
}>();
</script>

<template>
  <div class="section-header">
    <div>
      <p v-if="subtitle">{{ subtitle }}</p>
      <h2>{{ title }}</h2>
    </div>

    <slot />
  </div>
</template>

<style scoped>
.section-header {
  align-items: end;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: var(--space-4);
}

h2 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

p {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0 0 8px;
}
</style>
