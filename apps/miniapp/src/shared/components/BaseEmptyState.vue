<script setup lang="ts">
defineProps<{
  description: string;
  icon?: string;
  title: string;
}>();
</script>

<template>
  <div class="empty">
    <span class="empty__icon">{{ icon ?? '◌' }}</span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<style scoped>
.empty {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: grid;
  gap: 6px;
  justify-items: center;
  min-height: 136px;
  padding: 18px 14px;
  text-align: center;
}

.empty__icon {
  align-items: center;
  background: var(--bg-muted);
  border-radius: 999px;
  color: var(--text-muted);
  display: inline-flex;
  font-size: 20px;
  height: 40px;
  justify-content: center;
  width: 40px;
}

h3 {
  font-size: 14px;
  font-weight: var(--weight-title);
  margin: 0;
}

p {
  color: var(--text-muted);
  font-size: var(--text-sm);
  line-height: 1.45;
  margin: 0;
  max-width: 28ch;
}
</style>
