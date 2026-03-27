<script setup lang="ts">
defineProps<{
  open: boolean;
  title?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-sheet">
      <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
        <section class="modal-sheet">
          <div class="modal-sheet__handle" />
          <header class="modal-sheet__header">
            <div v-if="title" class="modal-sheet__title">
              <h3>{{ title }}</h3>
            </div>
            <slot name="header" />
            <button class="modal-sheet__close" type="button" @click="emit('close')">×</button>
          </header>

          <div class="modal-sheet__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="modal-sheet__footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  align-items: end;
  backdrop-filter: blur(12px);
  background: color-mix(in srgb, var(--tg-text) 34%, transparent);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 16px 12px 0;
  position: fixed;
  z-index: var(--modal-backdrop-z);
}

.modal-sheet {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -10px 28px color-mix(in srgb, var(--tg-text) 16%, transparent);
  display: grid;
  gap: 0;
  max-height: min(88vh, 760px);
  max-width: 520px;
  overflow: hidden;
  width: 100%;
  z-index: var(--modal-sheet-z);
}

.modal-sheet__handle {
  background: color-mix(in srgb, var(--tg-hint) 40%, transparent);
  border-radius: 999px;
  height: 4px;
  justify-self: center;
  margin-top: 10px;
  width: 40px;
}

.modal-sheet__header {
  align-items: center;
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding: 10px 14px 12px;
}

.modal-sheet__title h3 {
  font-size: var(--text-lg);
  font-weight: var(--weight-interactive);
  margin: 0;
}

.modal-sheet__close {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--tg-text);
  cursor: pointer;
  display: inline-flex;
  font-size: 22px;
  height: 32px;
  justify-content: center;
  line-height: 1;
  width: 32px;
}

.modal-sheet__body {
  display: grid;
  gap: 12px;
  overflow-y: auto;
  padding: 0 14px 16px;
}

.modal-sheet__footer {
  border-top: 1px solid var(--border);
  display: grid;
  gap: 10px;
  padding: 12px 14px calc(var(--safe-bottom) + 16px);
}

.modal-sheet-enter-active,
.modal-sheet-leave-active {
  transition: opacity 180ms ease;
}

.modal-sheet-enter-active .modal-sheet,
.modal-sheet-leave-active .modal-sheet {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.modal-sheet-enter-from,
.modal-sheet-leave-to {
  opacity: 0;
}

.modal-sheet-enter-from .modal-sheet,
.modal-sheet-leave-to .modal-sheet {
  transform: translateY(32px);
}
</style>
