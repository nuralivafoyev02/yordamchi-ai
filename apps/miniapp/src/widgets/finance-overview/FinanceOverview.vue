<script setup lang="ts">
import type { CurrencyCode, DashboardAccount } from '@yordamchi/shared';
import { computed } from 'vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';
import { useText } from '../../shared/composables/useText';

const props = defineProps<{
  accounts: DashboardAccount[];
  baseCurrency?: CurrencyCode;
  monthSummary: Record<string, { expense: number; income: number }>;
}>();

const emit = defineEmits<{
  action: [mode: 'debt' | 'expense' | 'income' | 'plan'];
  selectAccount: [account: DashboardAccount];
}>();

const { locale, text } = useText();

const currencies = computed<CurrencyCode[]>(() => {
  const values = new Set<CurrencyCode>();

  if (props.baseCurrency) {
    values.add(props.baseCurrency);
  }

  props.accounts.forEach((account) => values.add(account.currency));
  Object.keys(props.monthSummary).forEach((currency) => values.add(currency as CurrencyCode));

  return Array.from(values);
});

const totalBalance = computed(() => props.accounts.reduce((sum, account) => sum + Number(account.current_balance ?? 0), 0));
const summaryCurrency = computed<CurrencyCode>(() => props.baseCurrency ?? props.accounts[0]?.currency ?? 'UZS');
const totalIncome = computed(() => currencies.value.reduce((sum, currency) => sum + Number(props.monthSummary[currency]?.income ?? 0), 0));
const totalExpense = computed(() => currencies.value.reduce((sum, currency) => sum + Number(props.monthSummary[currency]?.expense ?? 0), 0));
const netFlow = computed(() => totalIncome.value - totalExpense.value);

const overviewMetrics = computed(() => [
  { label: text('finance.monthIncome'), tone: 'success' as const, value: formatMoney(totalIncome.value, summaryCurrency.value) },
  { label: text('finance.monthExpense'), tone: 'warning' as const, value: formatMoney(totalExpense.value, summaryCurrency.value) },
  { label: text('finance.accountsCount'), tone: 'info' as const, value: String(props.accounts.length) },
]);

const flowCards = computed(() => currencies.value.map((currency) => {
  const summary = props.monthSummary[currency] ?? { expense: 0, income: 0 };
  const balance = props.accounts
    .filter((account) => account.currency === currency)
    .reduce((sum, account) => sum + Number(account.current_balance ?? 0), 0);

  return {
    balance,
    currency,
    expense: summary.expense,
    income: summary.income,
    net: summary.income - summary.expense,
    ratio: Math.min(0.96, Math.max(0.08, summary.expense / Math.max(summary.income + summary.expense, 1))),
  };
}));

const quickActions = computed(() => [
  { icon: '↓', label: text('finance.actionIncome'), mode: 'income' as const },
  { icon: '↑', label: text('finance.actionExpense'), mode: 'expense' as const },
  { icon: '↔', label: text('finance.actionDebt'), mode: 'debt' as const },
  { icon: '•', label: text('common.plan'), mode: 'plan' as const },
]);

function formatMoney(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat(locale.value, {
    currency,
    currencyDisplay: 'symbol',
    maximumFractionDigits: currency === 'UZS' ? 0 : 2,
    minimumFractionDigits: currency === 'UZS' ? 0 : 2,
    style: 'currency',
  }).format(amount);
}

function accountSpent(account: DashboardAccount) {
  return props.monthSummary[account.currency]?.expense ?? 0;
}

function accountRatio(account: DashboardAccount) {
  const spent = accountSpent(account);
  return Math.min(0.96, Math.max(0.12, spent / Math.max(spent + Number(account.current_balance ?? 0), 1)));
}

function accountTone(index: number) {
  return ['var(--accent)', 'var(--warning)', 'var(--success)', 'var(--danger)'][index % 4];
}
</script>

<template>
  <section class="overview">
    <BaseCard class="hero-card">
      <div class="hero-card__head">
        <div>
          <p>{{ text('finance.monthlyOverview') }}</p>
          <h2>{{ formatMoney(totalBalance, summaryCurrency) }}</h2>
        </div>

        <div :class="['net-pill', { 'net-pill--negative': netFlow < 0 }]">
          <small>{{ text('finance.monthNet') }}</small>
          <strong>{{ netFlow >= 0 ? '+' : '' }}{{ formatMoney(netFlow, summaryCurrency) }}</strong>
        </div>
      </div>

      <div class="metric-grid">
        <article v-for="metric in overviewMetrics" :key="metric.label" class="metric-card">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <StatusBadge :tone="metric.tone">{{ metric.label }}</StatusBadge>
        </article>
      </div>

      <div class="quick-action-bar">
        <div class="quick-action-bar__title">
          <span>{{ text('finance.quickActions') }}</span>
        </div>

        <div class="quick-action-bar__grid">
          <button
            v-for="item in quickActions"
            :key="item.mode"
            class="quick-action"
            type="button"
            @click="emit('action', item.mode)"
          >
            <span>{{ item.icon }}</span>
            <strong>{{ item.label }}</strong>
          </button>
        </div>
      </div>
    </BaseCard>

    <div class="flow-grid">
      <BaseCard v-for="item in flowCards" :key="item.currency" class="flow-card">
        <div class="flow-card__head">
          <strong>{{ item.currency }}</strong>
          <StatusBadge :tone="item.net >= 0 ? 'success' : 'warning'">
            {{ item.net >= 0 ? '+' : '' }}{{ formatMoney(item.net, item.currency) }}
          </StatusBadge>
        </div>

        <h3>{{ formatMoney(item.balance, item.currency) }}</h3>

        <div class="flow-card__progress">
          <i :style="{ width: `${item.ratio * 100}%` }" />
        </div>

        <div class="flow-card__meta">
          <span>{{ text('finance.monthIncome') }} · {{ formatMoney(item.income, item.currency) }}</span>
          <span>{{ text('finance.monthExpense') }} · {{ formatMoney(item.expense, item.currency) }}</span>
        </div>
      </BaseCard>
    </div>

    <BaseCard class="account-card">
      <div class="account-card__header">
        <div>
          <p>{{ text('finance.assets') }}</p>
          <h3>{{ text('finance.cashPosition') }}</h3>
        </div>
        <StatusBadge tone="info">{{ props.accounts.length }}</StatusBadge>
      </div>

      <div v-if="props.accounts.length" class="account-list">
        <button
          v-for="(account, index) in props.accounts"
          :key="account.id"
          class="account-row"
          type="button"
          @click="emit('selectAccount', account)"
        >
          <span class="account-row__icon" :style="{ background: accountTone(index) }">{{ account.currency }}</span>
          <div class="account-row__copy">
            <strong>{{ account.name }}</strong>
            <small>{{ formatMoney(accountSpent(account), account.currency) }} {{ text('finance.expense').toLowerCase() }}</small>
            <div class="account-row__progress">
              <i :style="{ background: accountTone(index), width: `${accountRatio(account) * 100}%` }" />
            </div>
          </div>
          <div class="account-row__meta">
            <strong>{{ formatMoney(account.current_balance, account.currency) }}</strong>
            <small>{{ account.is_default ? text('finance.defaultAccount') : account.currency }}</small>
          </div>
        </button>
      </div>
      <p v-else class="account-card__empty">{{ text('finance.noAccounts') }}</p>
    </BaseCard>
  </section>
</template>

<style scoped>
.overview {
  display: grid;
  gap: 16px;
}

.hero-card {
  display: grid;
  gap: 20px;
}

.hero-card__head {
  align-items: start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.hero-card__head p,
.account-card__header p {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0 0 8px;
}

.hero-card__head h2 {
  font-family: var(--font-display);
  font-size: clamp(36px, 9vw, 48px);
  line-height: 1.02;
  margin: 0;
}

.net-pill {
  align-content: center;
  align-self: stretch;
  background: rgba(54, 209, 106, 0.12);
  border: 1px solid rgba(54, 209, 106, 0.2);
  border-radius: var(--radius-md);
  display: grid;
  gap: 6px;
  min-width: 148px;
  padding: 14px 16px;
}

.net-pill small {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.net-pill strong {
  color: var(--success);
  font-size: var(--text-lg);
}

.net-pill--negative {
  background: rgba(255, 177, 26, 0.12);
  border-color: rgba(255, 177, 26, 0.22);
}

.net-pill--negative strong {
  color: var(--warning);
}

.metric-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-card {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: grid;
  gap: 10px;
  padding: 14px;
}

.metric-card span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.metric-card strong {
  font-size: var(--text-md);
}

.quick-action-bar {
  display: grid;
  gap: 12px;
}

.quick-action-bar__title span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.quick-action-bar__grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.quick-action {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  cursor: pointer;
  display: grid;
  gap: 10px;
  justify-items: center;
  min-height: 92px;
  padding: 14px 10px;
  transition: transform 160ms ease, border-color 160ms ease;
}

.quick-action:hover {
  border-color: rgba(var(--accent-rgb), 0.28);
  transform: translateY(-1px);
}

.quick-action span {
  align-items: center;
  background: rgba(var(--accent-rgb), 0.14);
  border-radius: 999px;
  color: var(--accent-strong);
  display: inline-flex;
  font-size: 22px;
  height: 44px;
  justify-content: center;
  width: 44px;
}

.quick-action strong {
  font-size: var(--text-sm);
}

.flow-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.flow-card {
  display: grid;
  gap: 14px;
}

.flow-card__head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.flow-card h3 {
  font-family: var(--font-display);
  font-size: 28px;
  margin: 0;
}

.flow-card__progress {
  background: var(--surface-soft);
  border-radius: 999px;
  height: 6px;
  overflow: hidden;
}

.flow-card__progress i {
  background: var(--accent);
  border-radius: inherit;
  display: block;
  height: 100%;
}

.flow-card__meta {
  color: var(--text-muted);
  display: grid;
  gap: 6px;
  font-size: 13px;
}

.account-card {
  display: grid;
  gap: 14px;
}

.account-card__header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.account-card__header h3 {
  font-family: var(--font-display);
  font-size: 26px;
  margin: 0;
}

.account-list {
  display: grid;
  gap: 10px;
}

.account-row {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  cursor: pointer;
  display: grid;
  gap: 14px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 14px;
  text-align: left;
}

.account-row__icon {
  align-items: center;
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 700;
  height: 38px;
  justify-content: center;
  width: 38px;
}

.account-row__copy {
  display: grid;
  gap: 6px;
}

.account-row__copy strong,
.account-row__meta strong {
  font-size: var(--text-md);
}

.account-row__copy small,
.account-row__meta small,
.account-card__empty {
  color: var(--text-muted);
}

.account-row__progress {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 999px;
  height: 5px;
  overflow: hidden;
}

.account-row__progress i {
  border-radius: inherit;
  display: block;
  height: 100%;
}

.account-row__meta {
  display: grid;
  gap: 4px;
  justify-items: end;
}

.account-card__empty {
  margin: 0;
}

@media (max-width: 640px) {
  .hero-card__head {
    flex-direction: column;
  }

  .net-pill {
    min-width: 0;
    width: 100%;
  }

  .metric-grid,
  .quick-action-bar__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
