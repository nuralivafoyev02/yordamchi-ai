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
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <section class="modal-sheet">
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
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  align-items: end;
  background: rgba(0, 0, 0, 0.56);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 16px;
  position: fixed;
  z-index: 60;
}

.modal-sheet {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 0;
  max-height: min(84vh, 760px);
  max-width: 520px;
  overflow: hidden;
  width: 100%;
}

.modal-sheet__header {
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 16px 18px;
}

.modal-sheet__title h3 {
  font-family: var(--font-display);
  font-size: 20px;
  margin: 0;
}

.modal-sheet__close {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  font-size: 22px;
  height: 36px;
  justify-content: center;
  line-height: 1;
  width: 36px;
}

.modal-sheet__body {
  display: grid;
  gap: 14px;
  overflow-y: auto;
  padding: 18px;
}

.modal-sheet__footer {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: grid;
  gap: 10px;
  padding: 14px 18px 18px;
}
</style>
