<script setup lang="ts">
defineProps<{
  block?: boolean;
  variant?: 'ghost' | 'primary' | 'secondary';
}>();
</script>

<template>
  <button :class="['button', `button--${variant ?? 'primary'}`, { 'button--block': block }]">
    <slot />
  </button>
</template>

<style scoped>
.button {
  align-items: center;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
  gap: 8px;
  justify-content: center;
  max-height: var(--button-height);
  min-height: var(--button-height);
  padding: 0 14px;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 80ms ease,
    box-shadow 160ms ease;
}

.button:hover {
  opacity: 0.94;
}

.button--block {
  width: 100%;
}

.button--primary {
  background: var(--hero-gradient);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--hero-glow) 48%, transparent);
  color: var(--accent-contrast);
}

.button--secondary {
  background: var(--surface-soft);
  border-color: var(--border-strong);
  color: var(--text);
}

.button--ghost {
  background: color-mix(in srgb, var(--surface-strong) 88%, transparent);
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}
</style>
