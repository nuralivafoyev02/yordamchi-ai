<script setup lang="ts">
defineProps<{
  description: string;
  title: string;
}>();
</script>

<template>
  <div class="empty">
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<style scoped>
.empty {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  text-align: center;
}

h3 {
  font-family: var(--font-display);
  margin: 0 0 8px;
}

p {
  color: var(--text-muted);
  margin: 0;
}
</style>
