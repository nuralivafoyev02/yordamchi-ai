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
  gap: 12px;
}

article {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: space-between;
  padding: 14px 16px;
}

strong {
  display: block;
  margin-bottom: 4px;
}

span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.toggle {
  background: var(--accent);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  height: 28px;
  position: relative;
  width: 50px;
}

.toggle--off {
  background: var(--surface-strong);
}

.toggle::after {
  background: #fff;
  border-radius: 999px;
  content: "";
  height: 20px;
  position: absolute;
  right: 4px;
  top: 4px;
  transition: transform 140ms ease;
  width: 20px;
}

.toggle--off::after {
  transform: translateX(-22px);
}
</style>
