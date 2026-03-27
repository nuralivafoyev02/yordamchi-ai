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
  font-size: var(--text-lg);
  font-weight: var(--weight-title);
  margin: 0;
}

p {
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: var(--weight-interactive);
  letter-spacing: 0.08em;
  margin: 0 0 6px;
  text-transform: uppercase;
}
</style>
