<script setup lang="ts">
defineProps<{
  tone?: 'danger' | 'info' | 'premium' | 'success' | 'warning';
}>();
</script>

<template>
  <span :class="['badge', `badge--${tone ?? 'info'}`]">
    <slot />
  </span>
</template>

<style scoped>
.badge {
  border-radius: 999px;
  display: inline-flex;
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 6px 10px;
  text-transform: uppercase;
}

.badge--info {
  background: rgba(var(--accent-rgb), 0.16);
  color: var(--accent-strong);
}

.badge--success {
  background: rgba(54, 209, 106, 0.14);
  color: var(--success);
}

.badge--warning {
  background: rgba(255, 177, 26, 0.14);
  color: var(--warning);
}

.badge--danger {
  background: rgba(255, 107, 92, 0.14);
  color: var(--danger);
}

.badge--premium {
  background: rgba(240, 193, 82, 0.16);
  color: var(--accent-strong);
}
</style>
