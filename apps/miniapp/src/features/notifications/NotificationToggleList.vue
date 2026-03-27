<script setup lang="ts">
defineProps<{
  items: Array<{
    description: string;
    enabled: boolean;
    id: string;
    label: string;
  }>;
}>();

const emit = defineEmits<{
  toggle: [id: string];
}>();
</script>

<template>
  <div class="list">
    <article v-for="item in items" :key="item.id">
      <div>
        <strong>{{ item.label }}</strong>
        <span>{{ item.description }}</span>
      </div>
      <button :class="['toggle', { 'toggle--off': !item.enabled }]" type="button" @click="emit('toggle', item.id)" />
    </article>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 8px;
}

article {
  align-items: center;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)), var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
}

strong {
  display: block;
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
  margin-bottom: 2px;
}

span {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.toggle {
  background: var(--accent);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  height: 22px;
  position: relative;
  width: 38px;
}

.toggle--off {
  background: var(--surface-contrast);
  border: 1px solid var(--border);
}

.toggle::after {
  background: var(--accent-contrast);
  border-radius: 999px;
  content: "";
  height: 16px;
  position: absolute;
  right: 3px;
  top: 3px;
  transition: transform 140ms ease;
  width: 16px;
}

.toggle--off::after {
  transform: translateX(-16px);
}
</style>
