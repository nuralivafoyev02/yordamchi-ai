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
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  font-size: var(--text-sm);
  font-weight: 700;
  gap: 8px;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.button:hover {
  opacity: 0.94;
}

.button--block {
  width: 100%;
}

.button--primary {
  background: var(--accent);
  box-shadow: 0 10px 24px rgba(var(--accent-rgb), 0.26);
  color: var(--accent-contrast);
}

.button--secondary {
  background: var(--surface-strong);
  border-color: var(--border);
  color: var(--text);
}

.button--ghost {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  color: var(--text);
}
</style>
