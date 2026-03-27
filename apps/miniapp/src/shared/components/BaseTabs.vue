<script setup lang="ts">
import { computed } from 'vue';

interface TabItem {
  icon: 'finance' | 'home' | 'profile';
  label: string;
  to: string;
}

const props = defineProps<{
  items: TabItem[];
}>();

const iconPaths = computed<Record<TabItem['icon'], string[]>>(() => ({
  finance: [
    'M4 18h16',
    'M7 14l3-3 3 2 4-5',
  ],
  home: [
    'M4 10.5 12 4l8 6.5',
    'M6.5 9.5V20h11V9.5',
  ],
  profile: [
    'M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
    'M5.5 19.5a6.5 6.5 0 0 1 13 0',
  ],
}));
</script>

<template>
  <nav class="tabs">
    <router-link
      v-for="item in props.items"
      :key="item.to"
      :to="item.to"
      class="tabs__item"
      active-class="tabs__item--active"
    >
      <svg class="tabs__icon" fill="none" viewBox="0 0 24 24">
        <path
          v-for="path in iconPaths[item.icon]"
          :key="path"
          :d="path"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
      </svg>
      <span>{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.tabs {
  align-items: center;
  background: #202023;
  border: 1px solid var(--border);
  border-radius: 28px;
  bottom: 14px;
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(3, 1fr);
  left: 14px;
  padding: 8px 10px;
  position: fixed;
  right: 14px;
  z-index: 20;
}

.tabs__item {
  align-items: center;
  border-radius: 16px;
  color: var(--text-muted);
  display: grid;
  gap: 4px;
  justify-items: center;
  min-height: 46px;
  padding: 4px;
  text-align: center;
}

.tabs__icon {
  height: 18px;
  width: 18px;
}

.tabs__item span {
  font-size: 10px;
  font-weight: 600;
}

.tabs__item--active {
  color: var(--accent-strong);
}

.tabs__item--active .tabs__icon {
  filter: drop-shadow(0 0 10px rgba(var(--accent-rgb), 0.18));
}
</style>
