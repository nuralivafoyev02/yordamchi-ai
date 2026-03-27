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
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 7px 10px;
  text-transform: uppercase;
}

.badge--info {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.badge--success {
  background: rgba(25, 144, 95, 0.12);
  color: var(--success);
}

.badge--warning {
  background: rgba(197, 124, 0, 0.12);
  color: var(--warning);
}

.badge--danger {
  background: rgba(214, 73, 73, 0.12);
  color: var(--danger);
}

.badge--premium {
  background: linear-gradient(135deg, rgba(255, 219, 149, 0.5), rgba(228, 179, 45, 0.2));
  color: #9c6500;
}
</style>
