<script setup lang="ts">
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseEmptyState from '../../shared/components/BaseEmptyState.vue';
import SectionHeader from '../../shared/components/SectionHeader.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';
import { useText } from '../../shared/composables/useText';

const props = defineProps<{
  selectedDay: Record<string, unknown> | null;
}>();

const emit = defineEmits<{
  create: [mode: 'debt' | 'expense' | 'plan'];
}>();

const { text } = useText();
</script>

<template>
  <BaseCard>
    <SectionHeader :subtitle="selectedDay ? String(selectedDay.date) : undefined" :title="text('common.today')" />

    <template v-if="selectedDay">
      <div class="drawer__actions">
        <BaseButton variant="secondary" @click="emit('create', 'plan')">{{ text('common.plan') }}</BaseButton>
        <BaseButton variant="secondary" @click="emit('create', 'expense')">{{ text('common.expense') }}</BaseButton>
        <BaseButton variant="secondary" @click="emit('create', 'debt')">{{ text('common.debt') }}</BaseButton>
      </div>

      <ul class="drawer__list">
        <li v-for="item in (selectedDay.items as Array<Record<string, unknown>>)" :key="String(item.kind) + String(item.id)">
          <StatusBadge :tone="item.kind === 'debt' ? 'danger' : item.kind === 'transaction' ? 'warning' : 'info'">
            {{ item.kind }}
          </StatusBadge>
          <strong>{{ item.title ?? item.note ?? item.counterparty_name ?? item.entity_type }}</strong>
        </li>
      </ul>
    </template>

    <BaseEmptyState
      v-else
      :description="text('home.empty')"
      :title="text('common.today')"
    />
  </BaseCard>
</template>

<style scoped>
.drawer__actions {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 18px;
}

.drawer__list {
  display: grid;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

li {
  align-items: center;
  background: var(--surface-strong);
  border-radius: var(--radius-md);
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 14px 16px;
}

strong {
  font-size: var(--text-sm);
}
</style>
