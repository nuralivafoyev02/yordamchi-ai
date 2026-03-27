<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseEmptyState from '../../shared/components/BaseEmptyState.vue';
import SectionHeader from '../../shared/components/SectionHeader.vue';
import { apiClient } from '../../shared/api/client';
import { useSessionStore } from '../../app/stores/session';
import { useText } from '../../shared/composables/useText';
import FinanceOverview from '../../widgets/finance-overview/FinanceOverview.vue';

const sessionStore = useSessionStore();
const { text } = useText();
const financeItems = ref<Array<Record<string, unknown>>>([]);

const dashboard = computed(() => (sessionStore.dashboard as Record<string, unknown>) ?? {});

onMounted(async () => {
  if (!sessionStore.token) {
    return;
  }

  const month = new Date().toISOString().slice(0, 7) + '-01';
  const response = await apiClient.get(`/api/v1/finance/summary?month=${month}`);
  financeItems.value = (response.items as Array<Record<string, unknown>>) ?? [];
});
</script>

<template>
  <div class="page">
    <FinanceOverview
      :accounts="(dashboard.accounts as Array<Record<string, unknown>> | undefined) ?? []"
      :month-summary="(dashboard.monthSummary as Record<string, { expense: number; income: number }> | undefined) ?? {}"
    />

    <BaseCard>
      <SectionHeader :subtitle="text('finance.monthlyOverview')" :title="text('tabs.finance')" />
      <ul v-if="financeItems.length" class="finance-list">
        <li v-for="item in financeItems" :key="String(item.id)">
          <strong>{{ item.note || item.direction }}</strong>
          <span>{{ item.original_amount }} {{ item.original_currency }}</span>
        </li>
      </ul>
      <BaseEmptyState v-else :description="text('finance.noTransactions')" :title="text('finance.expense')" />
    </BaseCard>

    <BaseCard>
      <SectionHeader :subtitle="text('finance.debts')" :title="text('finance.limits')" />
      <ul v-if="((dashboard.openDebts as Array<unknown> | undefined)?.length ?? 0) > 0" class="finance-list">
        <li v-for="debt in (dashboard.openDebts as Array<Record<string, unknown>>)" :key="String(debt.id)">
          <strong>{{ debt.counterparty_name }}</strong>
          <span>{{ debt.principal_amount }} {{ debt.principal_currency }}</span>
        </li>
      </ul>
      <BaseEmptyState v-else :description="text('premium.lockedBody')" :title="text('finance.debts')" />
    </BaseCard>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 18px;
}

.finance-list {
  display: grid;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.finance-list li {
  align-items: center;
  background: var(--surface-strong);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: space-between;
  padding: 14px 16px;
}

span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
