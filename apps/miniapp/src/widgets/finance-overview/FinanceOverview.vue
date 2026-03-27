<script setup lang="ts">
import BaseCard from '../../shared/components/BaseCard.vue';
import SectionHeader from '../../shared/components/SectionHeader.vue';
import { useText } from '../../shared/composables/useText';

defineProps<{
  accounts: Array<Record<string, unknown>>;
  monthSummary: Record<string, { expense: number; income: number }>;
}>();

const { text } = useText();
</script>

<template>
  <BaseCard>
    <SectionHeader :subtitle="text('finance.monthlyOverview')" :title="text('finance.balances')" />

    <div class="finance-grid">
      <article v-for="account in accounts" :key="String(account.id)" class="finance-card">
        <span>{{ account.currency }}</span>
        <strong>{{ account.current_balance }}</strong>
      </article>
    </div>

    <div class="summary-grid">
      <article v-for="(summary, currency) in monthSummary" :key="currency" class="summary-card">
        <p>{{ currency }}</p>
        <strong>+{{ summary.income }}</strong>
        <span>-{{ summary.expense }}</span>
      </article>
    </div>
  </BaseCard>
</template>

<style scoped>
.finance-grid,
.summary-grid {
  display: grid;
  gap: 12px;
}

.finance-grid {
  grid-template-columns: repeat(2, 1fr);
  margin-bottom: 14px;
}

.finance-card,
.summary-card {
  background: var(--surface-strong);
  border-radius: var(--radius-md);
  padding: 16px;
}

span,
p {
  color: var(--text-muted);
  margin: 0;
}

strong {
  display: block;
  font-family: var(--font-display);
  font-size: 22px;
  margin-top: 8px;
}
</style>
