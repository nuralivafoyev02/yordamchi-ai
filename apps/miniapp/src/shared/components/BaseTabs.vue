<script setup lang="ts">
interface TabItem {
  label: string;
  to: string;
}

defineProps<{
  items: TabItem[];
}>();
</script>

<template>
  <nav class="tabs">
    <router-link
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="tabs__item"
      active-class="tabs__item--active"
    >
      {{ item.label }}
    </router-link>
  </nav>
</template>

<style scoped>
.tabs {
  align-items: center;
  backdrop-filter: blur(18px);
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--border);
  border-radius: 999px;
  bottom: 18px;
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, 1fr);
  left: 18px;
  padding: 8px;
  position: fixed;
  right: 18px;
  z-index: 20;
}

.tabs__item {
  border-radius: 999px;
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: 700;
  padding: 12px 10px;
  text-align: center;
}

.tabs__item--active {
  background: var(--accent-soft);
  color: var(--accent-strong);
}
</style>
