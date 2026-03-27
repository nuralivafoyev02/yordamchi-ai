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
  align-items: center;
  border: 1px solid transparent;
  border-radius: 999px;
  display: inline-flex;
  font-size: var(--text-xs);
  font-weight: var(--weight-interactive);
  letter-spacing: 0.08em;
  min-height: 18px;
  padding: 0 8px;
  text-transform: uppercase;
}

.badge--info {
  background: var(--info-soft);
  border-color: color-mix(in srgb, var(--info) 26%, transparent);
  color: var(--accent-strong);
}

.badge--success {
  background: var(--success-soft);
  border-color: color-mix(in srgb, var(--success) 22%, transparent);
  color: var(--success);
}

.badge--warning {
  background: var(--warning-soft);
  border-color: color-mix(in srgb, var(--warning) 22%, transparent);
  color: var(--warning);
}

.badge--danger {
  background: var(--danger-soft);
  border-color: color-mix(in srgb, var(--danger) 22%, transparent);
  color: var(--danger);
}

.badge--premium {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 24%, transparent);
  color: var(--accent-strong);
}
</style>
