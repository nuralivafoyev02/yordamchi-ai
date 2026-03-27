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
  border-radius: 6px;
  display: inline-flex;
  font-size: var(--text-xs);
  font-weight: var(--weight-interactive);
  letter-spacing: 0.03em;
  min-height: 18px;
  padding: 2px 8px;
  text-transform: uppercase;
}

.badge--info {
  background: var(--info-soft);
  color: var(--accent-strong);
}

.badge--success {
  background: var(--success-soft);
  color: var(--success);
}

.badge--warning {
  background: var(--warning-soft);
  color: var(--warning);
}

.badge--danger {
  background: var(--danger-soft);
  color: var(--danger);
}

.badge--premium {
  background: var(--accent-soft);
  color: var(--accent-strong);
}
</style>
