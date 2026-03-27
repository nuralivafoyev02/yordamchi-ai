<script setup lang="ts">
import type { CalendarDayDetails, CalendarDayItem } from '@yordamchi/shared';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseEmptyState from '../../shared/components/BaseEmptyState.vue';
import { useText } from '../../shared/composables/useText';

const props = defineProps<{
  selectedDay: CalendarDayDetails | null;
}>();

const emit = defineEmits<{
  create: [mode: 'debt' | 'expense' | 'plan'];
}>();

const { locale, text } = useText();

function itemTitle(item: CalendarDayItem) {
  return String(item.title ?? item.note ?? item.counterparty_name ?? item.entity_type ?? text('home.dayAgenda'));
}

function itemMeta(item: CalendarDayItem) {
  if (item.kind === 'transaction') {
    return `${Number(item.original_amount ?? 0).toLocaleString(locale.value)} ${String(item.original_currency ?? '')}`.trim();
  }

  if (item.kind === 'debt') {
    return `${Number(item.principal_amount ?? 0).toLocaleString(locale.value)} ${String(item.principal_currency ?? '')}`.trim();
  }

  const timestamp = String(item.due_at ?? item.scheduled_for ?? item.occurred_at ?? '');
  return timestamp.includes('T')
    ? new Date(timestamp).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
    : '';
}

function toneClass(kind: CalendarDayItem['kind']) {
  if (kind === 'debt') return 'day-item__dot--danger';
  if (kind === 'transaction') return 'day-item__dot--warning';
  if (kind === 'reminder') return 'day-item__dot--success';
  return 'day-item__dot--info';
}
</script>

<template>
  <BaseCard class="drawer">
    <div class="drawer__header">
      <div>
        <p>{{ selectedDay?.date ?? text('common.today') }}</p>
        <h2>{{ text('home.dayAgenda') }}</h2>
      </div>
      <div class="drawer__actions">
        <BaseButton variant="secondary" @click="emit('create', 'plan')">{{ text('common.plan') }}</BaseButton>
        <BaseButton variant="secondary" @click="emit('create', 'expense')">{{ text('common.expense') }}</BaseButton>
        <BaseButton variant="secondary" @click="emit('create', 'debt')">{{ text('common.debt') }}</BaseButton>
      </div>
    </div>

    <div v-if="selectedDay?.items.length" class="drawer__list">
      <article v-for="item in selectedDay.items" :key="`${item.kind}-${item.id}`" class="day-item">
        <span :class="['day-item__dot', toneClass(item.kind)]" />
        <div class="day-item__copy">
          <strong>{{ itemTitle(item) }}</strong>
          <small>{{ itemMeta(item) || item.kind }}</small>
        </div>
      </article>
    </div>

    <BaseEmptyState v-else :description="text('home.empty')" :title="text('home.noEventsToday')" />
  </BaseCard>
</template>

<style scoped>
.drawer {
  display: grid;
  gap: 16px;
}

.drawer__header {
  display: grid;
  gap: 14px;
}

.drawer__header p {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0 0 6px;
}

.drawer__header h2 {
  font-family: var(--font-display);
  font-size: 24px;
  margin: 0;
}

.drawer__actions {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.drawer__list {
  display: grid;
  gap: 12px;
}

.day-item {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: flex;
  gap: 14px;
  padding: 15px 16px;
}

.day-item__dot {
  border-radius: 999px;
  display: inline-block;
  flex: 0 0 10px;
  height: 10px;
  width: 10px;
}

.day-item__dot--info {
  background: var(--accent);
}

.day-item__dot--success {
  background: var(--success);
}

.day-item__dot--warning {
  background: var(--warning);
}

.day-item__dot--danger {
  background: var(--danger);
}

.day-item__copy {
  display: grid;
  gap: 4px;
}

.day-item__copy strong {
  font-size: var(--text-md);
}

.day-item__copy small {
  color: var(--text-muted);
}

@media (min-width: 420px) {
  .drawer__header {
    align-items: center;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
