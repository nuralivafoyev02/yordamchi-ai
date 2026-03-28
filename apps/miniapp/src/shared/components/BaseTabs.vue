<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

interface TabItem {
  icon: 'admin' | 'finance' | 'home' | 'profile';
  label: string;
  to: string;
}

const props = defineProps<{
  items: TabItem[];
}>();
const route = useRoute();

const iconPaths = computed<Record<TabItem['icon'], string[]>>(() => ({
  admin: [
    'M12 3 18 5.6v5.4c0 4.3-2.5 8.2-6 10-3.5-1.8-6-5.7-6-10V5.6L12 3Z',
    'M9.5 12.5 11.2 14.2 14.8 10.6',
  ],
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
  <nav class="tabs-shell">
    <div
      class="tabs"
      :style="{ gridTemplateColumns: `repeat(${Math.max(props.items.length, 1)}, minmax(0, 1fr))` }"
    >
      <router-link
        v-for="item in props.items"
        :key="item.to"
        :to="item.to"
        :aria-current="route.path === item.to ? 'page' : undefined"
        :class="['tabs__item', { 'tabs__item--active': route.path === item.to }]"
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
    </div>
  </nav>
</template>

<style scoped>
.tabs-shell {
  bottom: 0;
  left: 0;
  padding: 0 14px calc(var(--safe-bottom) + 12px);
  pointer-events: none;
  position: fixed;
  right: 0;
  z-index: var(--nav-z);
}

.tabs {
  align-items: center;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01)),
    color-mix(in srgb, var(--surface) 94%, var(--bg) 6%);
  border: 1px solid var(--border-strong);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.32);
  border-top-color: color-mix(in srgb, var(--text-muted) 20%, transparent);
  border-radius: 24px;
  display: grid;
  gap: 6px;
  margin: 0 auto;
  max-width: 520px;
  padding: 8px 10px 10px;
  pointer-events: auto;
}

.tabs__item {
  align-items: center;
  border-radius: 18px;
  color: var(--text-soft);
  display: grid;
  gap: 4px;
  justify-items: center;
  min-height: 52px;
  padding: 6px 6px 8px;
  text-align: center;
  transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
}

.tabs__icon {
  height: 22px;
  width: 22px;
}

.tabs__item span {
  font-size: 10px;
  font-weight: var(--weight-interactive);
  line-height: 1.1;
}

.tabs__item--active {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent);
  color: var(--accent);
}
</style>
