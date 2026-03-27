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
  border: none;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  font-weight: 700;
  gap: 8px;
  justify-content: center;
  min-height: 48px;
  padding: 0 20px;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.button:hover {
  transform: translateY(-1px);
}

.button--block {
  width: 100%;
}

.button--primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  box-shadow: var(--shadow-soft);
  color: #fff;
}

.button--secondary {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.button--ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}
</style>
