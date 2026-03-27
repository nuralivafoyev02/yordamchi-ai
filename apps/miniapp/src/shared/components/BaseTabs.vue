<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

interface TabItem {
  icon: 'finance' | 'home' | 'profile';
  label: string;
  to: string;
}

const props = defineProps<{
  items: TabItem[];
}>();
const route = useRoute();

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
  <nav class="tabs-shell">
    <div class="tabs">
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
  padding: 0 12px calc(var(--safe-bottom) + 8px);
  position: fixed;
  right: 0;
  z-index: var(--nav-z);
}

.tabs {
  align-items: center;
  background: color-mix(in srgb, var(--tg-bg) 92%, var(--tg-secondary-bg) 8%);
  border-top: 1px solid color-mix(in srgb, var(--tg-hint) 20%, transparent);
  box-shadow: 0 -1px 8px color-mix(in srgb, var(--tg-text) 6%, transparent);
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(3, 1fr);
  margin: 0 auto;
  max-width: 460px;
  padding: 8px 10px 0;
}

.tabs__item {
  align-items: center;
  border-radius: 14px;
  color: var(--tg-hint);
  display: grid;
  gap: 4px;
  justify-items: center;
  min-height: 48px;
  padding: 4px 6px 8px;
  text-align: center;
  transition: background 120ms ease, color 120ms ease;
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
  background: color-mix(in srgb, var(--tg-button) 16%, transparent);
  color: var(--tg-button);
}
</style>
