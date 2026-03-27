<script setup lang="ts">
import { computed } from 'vue';
import { useToast } from '../../composables/useToast';

const toast = useToast();

const toastClass = computed(() => [
  'toast',
  toast.current.value ? `toast--${toast.current.value.variant}` : null,
  {
    'toast--closing': toast.isClosing.value,
  },
]);
</script>

<template>
  <Teleport to="body">
    <Transition name="toast-fade">
      <div v-if="toast.visible.value && toast.current.value" class="toast-shell">
        <article :class="toastClass" @click="toast.dismiss()">
          <strong v-if="toast.current.value.title">{{ toast.current.value.title }}</strong>
          <p>{{ toast.current.value.message }}</p>
        </article>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-shell {
  left: 16px;
  position: fixed;
  right: 16px;
  top: calc(var(--safe-top) + 12px);
  z-index: var(--toast-z);
}

.toast {
  background: color-mix(in srgb, var(--tg-secondary-bg) 94%, var(--tg-bg) 6%);
  border: 1px solid var(--border);
  border-left: 4px solid var(--tg-link);
  border-radius: 14px;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--tg-text) 10%, transparent);
  color: var(--tg-text);
  cursor: pointer;
  display: grid;
  gap: 2px;
  margin: 0 auto;
  max-width: 460px;
  padding: 10px 12px;
}

.toast strong {
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
}

.toast p {
  color: var(--tg-text);
  font-size: var(--text-body);
  line-height: 1.35;
  margin: 0;
}

.toast--success {
  border-left-color: var(--success);
}

.toast--error {
  border-left-color: var(--danger);
}

.toast--warning {
  border-left-color: var(--warning);
}

.toast--info {
  border-left-color: var(--tg-link);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
