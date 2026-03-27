<script setup lang="ts">
import type { CurrencyCode, DashboardAccount, DashboardDebt, DashboardSnapshot, UserProfileSnapshot } from '@yordamchi/shared';
import { computed, ref, watch } from 'vue';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseEmptyState from '../../shared/components/BaseEmptyState.vue';
import BaseModal from '../../shared/components/BaseModal.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';
import { apiClient } from '../../shared/api/client';
import { useSessionStore } from '../../app/stores/session';
import { useText } from '../../shared/composables/useText';
import FinanceOverview from '../../widgets/finance-overview/FinanceOverview.vue';
import DayEntryModal from '../../features/calendar-entry/DayEntryModal.vue';

interface FinanceSummaryItem {
  direction: 'expense' | 'income';
  note: string | null;
  occurred_at: string;
  original_amount: number;
  original_currency: CurrencyCode;
  status: string;
}

type ActivityFilter = 'all' | 'expense' | 'income';

const sessionStore = useSessionStore();
const { locale, text } = useText();

const activeFilter = ref<ActivityFilter>('all');
const financeError = ref('');
const financeItems = ref<FinanceSummaryItem[]>([]);
const financeLoading = ref(false);
const modalOpen = ref(false);
const modalMode = ref<'debt' | 'expense' | 'income' | 'plan'>('expense');
const monthStart = ref(startOfMonth(new Date()));
const paymentAmount = ref('');
const paymentError = ref('');
const paymentNote = ref('');
const selectedAccount = ref<DashboardAccount | null>(null);
const selectedDebt = ref<DashboardDebt | null>(null);

const emptyDashboard: DashboardSnapshot = {
  accounts: [],
  monthSummary: {},
  openDebts: [],
  todayPlans: [],
  upcomingPlans: [],
};

const dashboard = computed(() => sessionStore.dashboard ?? emptyDashboard);
const profile = computed<UserProfileSnapshot | null>(() => sessionStore.profile);
const selectedMonthSummary = computed<Record<string, { expense: number; income: number }>>(() => {
  return financeItems.value.reduce<Record<string, { expense: number; income: number }>>((accumulator, item) => {
    const current = accumulator[item.original_currency] ?? { expense: 0, income: 0 };
    current[item.direction] += Number(item.original_amount ?? 0);
    accumulator[item.original_currency] = current;
    return accumulator;
  }, {});
});
const primaryCurrency = computed<CurrencyCode>(() => {
  const preferred = profile.value?.baseCurrency;
  if (preferred) {
    return preferred;
  }

  return (Object.keys(selectedMonthSummary.value)[0] as CurrencyCode | undefined) ?? dashboard.value.accounts[0]?.currency ?? 'UZS';
});

const primaryMonthSummary = computed(() => selectedMonthSummary.value[primaryCurrency.value] ?? { expense: 0, income: 0 });
const monthLabel = computed(() => new Date(`${monthStart.value}T12:00:00Z`).toLocaleDateString(locale.value, {
  month: 'long',
  year: 'numeric',
}));
const entryDraftDate = computed(() => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentMonth = startOfMonth(new Date());
  return monthStart.value === currentMonth ? todayIso : monthStart.value;
});

const activityFilters = computed(() => [
  { label: text('finance.filterAll'), value: 'all' as const },
  { label: text('finance.filterIncome'), value: 'income' as const },
  { label: text('finance.filterExpense'), value: 'expense' as const },
]);

const insightCards = computed(() => [
  {
    label: text('finance.monthIncome'),
    tone: 'success' as const,
    value: formatAmount(primaryMonthSummary.value.income, primaryCurrency.value),
  },
  {
    label: text('finance.monthExpense'),
    tone: 'warning' as const,
    value: formatAmount(primaryMonthSummary.value.expense, primaryCurrency.value),
  },
  {
    label: text('finance.openDebtCount'),
    tone: dashboard.value.openDebts.length ? 'danger' as const : 'info' as const,
    value: String(dashboard.value.openDebts.length),
  },
]);

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') {
    return financeItems.value;
  }

  return financeItems.value.filter((item) => item.direction === activeFilter.value);
});

const groupedItems = computed(() => {
  const groups = new Map<string, FinanceSummaryItem[]>();

  filteredItems.value.forEach((item) => {
    const key = item.occurred_at.slice(0, 10);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  });

  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items,
    label: new Date(`${date}T12:00:00Z`).toLocaleDateString(locale.value, {
      day: 'numeric',
      month: 'long',
      weekday: 'short',
    }),
  }));
});

const selectedAccountSummary = computed(() => {
  if (!selectedAccount.value) {
    return null;
  }

  const summary = selectedMonthSummary.value[selectedAccount.value.currency] ?? { expense: 0, income: 0 };

  return {
    expense: summary.expense,
    income: summary.income,
    net: summary.income - summary.expense,
  };
});

const paymentAccount = computed<DashboardAccount | null>(() => {
  if (!selectedDebt.value) {
    return null;
  }

  return dashboard.value.accounts.find((item) => item.currency === selectedDebt.value?.principal_currency && item.is_default)
    ?? dashboard.value.accounts.find((item) => item.currency === selectedDebt.value?.principal_currency)
    ?? dashboard.value.accounts.find((item) => item.is_default)
    ?? dashboard.value.accounts[0]
    ?? null;
});

function startOfMonth(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function shiftMonth(offset: number) {
  const anchor = new Date(`${monthStart.value}T12:00:00Z`);
  anchor.setUTCMonth(anchor.getUTCMonth() + offset);
  monthStart.value = startOfMonth(anchor);
}

function formatAmount(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat(locale.value, {
    currency,
    currencyDisplay: 'symbol',
    maximumFractionDigits: currency === 'UZS' ? 0 : 2,
    minimumFractionDigits: currency === 'UZS' ? 0 : 2,
    style: 'currency',
  }).format(amount);
}

function formatCalendarDate(value: string) {
  return new Date(value).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'short',
  });
}

function dueTone(debt: DashboardDebt) {
  if (!debt.due_at) {
    return 'info' as const;
  }

  const due = new Date(debt.due_at);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diffDays = Math.round((startDue - startToday) / 86400000);

  if (diffDays < 0) {
    return 'danger' as const;
  }

  if (diffDays === 0) {
    return 'warning' as const;
  }

  if (diffDays <= 3) {
    return 'info' as const;
  }

  return 'success' as const;
}

function dueLabel(debt: DashboardDebt) {
  if (!debt.due_at) {
    return formatCalendarDate(new Date().toISOString());
  }

  const due = new Date(debt.due_at);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diffDays = Math.round((startDue - startToday) / 86400000);

  if (diffDays < 0) {
    return text('finance.overdue');
  }

  if (diffDays === 0) {
    return text('finance.dueToday');
  }

  if (diffDays <= 3) {
    return text('finance.dueSoon');
  }

  return formatCalendarDate(debt.due_at);
}

function debtDirectionLabel(debt: DashboardDebt) {
  return debt.direction === 'borrowed' ? text('finance.borrowed') : text('finance.lent');
}

function openQuickAction(mode: 'debt' | 'expense' | 'income' | 'plan') {
  modalMode.value = mode;
  modalOpen.value = true;
}

function openDebtPayment(debt: DashboardDebt) {
  selectedDebt.value = debt;
  paymentAmount.value = String(debt.principal_amount);
  paymentNote.value = '';
  paymentError.value = '';
}

async function loadFinanceSummary() {
  if (!sessionStore.token) {
    return;
  }

  try {
    financeError.value = '';
    financeLoading.value = true;
    const response = await apiClient.get<{ items: FinanceSummaryItem[] }>(`/api/v1/finance/summary?month=${monthStart.value}`);
    financeItems.value = response.items ?? [];
  } catch (error) {
    financeError.value = error instanceof Error ? error.message : text('errors.generic');
  } finally {
    financeLoading.value = false;
  }
}

async function submitDebtPayment() {
  if (!selectedDebt.value) {
    return;
  }

  if (!paymentAccount.value) {
    paymentError.value = text('finance.noMatchingAccount');
    return;
  }

  try {
    paymentError.value = '';
    await apiClient.post('/api/v1/debts/payments', {
      accountId: paymentAccount.value.id,
      amount: Number(paymentAmount.value),
      currency: selectedDebt.value.principal_currency,
      debtId: selectedDebt.value.id,
      note: paymentNote.value || undefined,
      paidAt: new Date().toISOString(),
    });
    await Promise.all([sessionStore.refreshBootstrap(), loadFinanceSummary()]);
    selectedDebt.value = null;
  } catch (error) {
    paymentError.value = error instanceof Error ? error.message : text('errors.generic');
  }
}

async function handleEntrySaved() {
  await Promise.all([sessionStore.refreshBootstrap(), loadFinanceSummary()]);
}

watch(
  () => [sessionStore.bootstrapLoaded, sessionStore.token, monthStart.value] as const,
  async ([loaded, token]) => {
    if (loaded && token) {
      await loadFinanceSummary();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="page">
    <header class="page__header">
      <div>
        <p>{{ text('finance.monthlyOverview') }}</p>
        <h1>{{ text('tabs.finance') }}</h1>
      </div>

      <div class="page__actions">
        <div class="month-switcher">
          <button :aria-label="text('finance.monthSwitcherPrev')" type="button" @click="shiftMonth(-1)">‹</button>
          <strong>{{ monthLabel }}</strong>
          <button :aria-label="text('finance.monthSwitcherNext')" type="button" @click="shiftMonth(1)">›</button>
        </div>
        <button class="page__plus" type="button" @click="openQuickAction('expense')">+</button>
      </div>
    </header>

    <FinanceOverview
      :accounts="dashboard.accounts"
      :base-currency="profile?.baseCurrency"
      :month-summary="selectedMonthSummary"
      @action="openQuickAction"
      @select-account="selectedAccount = $event"
    />

    <div class="insight-grid">
      <BaseCard v-for="card in insightCards" :key="card.label" class="insight-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
        <StatusBadge :tone="card.tone">{{ card.label }}</StatusBadge>
      </BaseCard>
    </div>

    <p v-if="financeError" class="page__error">{{ financeError }}</p>

    <BaseCard class="panel-card">
      <div class="panel-card__header">
        <div>
          <p>{{ text('finance.activityFeedHint') }}</p>
          <h2>{{ text('finance.activityFeed') }}</h2>
        </div>
        <StatusBadge tone="info">{{ filteredItems.length }}</StatusBadge>
      </div>

      <div class="filter-row">
        <button
          v-for="filter in activityFilters"
          :key="filter.value"
          :class="['filter-chip', { 'filter-chip--active': activeFilter === filter.value }]"
          type="button"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <div v-if="financeLoading" class="panel-card__placeholder">{{ text('common.loading') }}</div>

      <div v-else-if="groupedItems.length" class="activity-group-list">
        <section v-for="group in groupedItems" :key="group.date" class="activity-group">
          <div class="activity-group__head">
            <strong>{{ group.label }}</strong>
            <small>{{ group.items.length }}</small>
          </div>

          <article
            v-for="item in group.items"
            :key="`${item.occurred_at}-${item.original_amount}-${item.note ?? item.direction}`"
            class="activity-item"
          >
            <span :class="['activity-item__icon', { 'activity-item__icon--income': item.direction === 'income' }]">
              {{ item.direction === 'income' ? '+' : '−' }}
            </span>
            <div class="activity-item__copy">
              <strong>{{ item.note || text(`finance.${item.direction}`) }}</strong>
              <small>{{ item.status === 'scheduled' ? text('common.soon') : formatCalendarDate(item.occurred_at) }}</small>
            </div>
            <strong :class="{ 'activity-item__amount--income': item.direction === 'income' }" class="activity-item__amount">
              {{ item.direction === 'income' ? '+' : '-' }}{{ formatAmount(item.original_amount, item.original_currency) }}
            </strong>
          </article>
        </section>
      </div>
      <BaseEmptyState v-else :description="text('finance.noActivityForMonth')" :title="text('finance.activityFeed')" />
    </BaseCard>

    <BaseCard class="panel-card">
      <div class="panel-card__header">
        <div>
          <p>{{ text('finance.debtBookHint') }}</p>
          <h2>{{ text('finance.debtBook') }}</h2>
        </div>
        <StatusBadge :tone="dashboard.openDebts.length ? 'warning' : 'info'">{{ dashboard.openDebts.length }}</StatusBadge>
      </div>

      <div v-if="dashboard.openDebts.length" class="debt-list">
        <article
          v-for="debt in dashboard.openDebts"
          :key="debt.id"
          class="debt-item"
        >
          <div class="debt-item__head">
            <div class="debt-item__copy">
              <strong>{{ debt.counterparty_name }}</strong>
              <div class="debt-item__badges">
                <StatusBadge :tone="debt.direction === 'borrowed' ? 'warning' : 'success'">{{ debtDirectionLabel(debt) }}</StatusBadge>
                <StatusBadge :tone="dueTone(debt)">{{ dueLabel(debt) }}</StatusBadge>
              </div>
            </div>

            <strong class="debt-item__amount">{{ formatAmount(debt.principal_amount, debt.principal_currency) }}</strong>
          </div>

          <div class="debt-item__footer">
            <small>{{ debt.due_at ? formatCalendarDate(debt.due_at) : text('finance.debtBookHint') }}</small>
            <BaseButton :block="false" variant="secondary" @click="openDebtPayment(debt)">{{ text('finance.recordPayment') }}</BaseButton>
          </div>
        </article>
      </div>
      <BaseEmptyState v-else :description="text('finance.noDebtHint')" :title="text('finance.debtBook')" />
    </BaseCard>

    <DayEntryModal
      :date="entryDraftDate"
      :mode="modalMode"
      :open="modalOpen"
      @close="modalOpen = false"
      @saved="handleEntrySaved"
    />

    <BaseModal :open="Boolean(selectedAccount)" :title="text('finance.accountDetails')" @close="selectedAccount = null">
      <template v-if="selectedAccount && selectedAccountSummary">
        <div class="sheet-hero">
          <small>{{ text('finance.cashPosition') }}</small>
          <strong>{{ selectedAccount.name }}</strong>
          <h3>{{ formatAmount(selectedAccount.current_balance, selectedAccount.currency) }}</h3>
        </div>

        <div class="sheet-grid">
          <article class="sheet-stat">
            <span>{{ text('finance.monthIncome') }}</span>
            <strong>{{ formatAmount(selectedAccountSummary.income, selectedAccount.currency) }}</strong>
          </article>
          <article class="sheet-stat">
            <span>{{ text('finance.monthExpense') }}</span>
            <strong>{{ formatAmount(selectedAccountSummary.expense, selectedAccount.currency) }}</strong>
          </article>
          <article class="sheet-stat">
            <span>{{ text('finance.defaultAccount') }}</span>
            <strong>{{ selectedAccount.is_default ? text('common.yes') : text('common.no') }}</strong>
          </article>
          <article class="sheet-stat">
            <span>{{ text('finance.monthNet') }}</span>
            <strong>{{ formatAmount(selectedAccountSummary.net, selectedAccount.currency) }}</strong>
          </article>
        </div>
      </template>
    </BaseModal>

    <BaseModal :open="Boolean(selectedDebt)" :title="text('finance.recordPayment')" @close="selectedDebt = null">
      <template v-if="selectedDebt">
        <div class="sheet-hero">
          <small>{{ debtDirectionLabel(selectedDebt) }}</small>
          <strong>{{ selectedDebt.counterparty_name }}</strong>
          <h3>{{ formatAmount(selectedDebt.principal_amount, selectedDebt.principal_currency) }}</h3>
        </div>

        <label class="sheet-field">
          <span>{{ text('finance.paymentAmount') }}</span>
          <input v-model="paymentAmount" inputmode="decimal" />
        </label>

        <label class="sheet-field">
          <span>{{ text('finance.paymentNote') }}</span>
          <input v-model="paymentNote" />
        </label>

        <div v-if="paymentAccount" class="payment-account">
          <small>{{ text('finance.selectAccount') }}</small>
          <strong>{{ paymentAccount.name }} · {{ paymentAccount.currency }}</strong>
        </div>

        <p v-if="paymentError" class="page__error">{{ paymentError }}</p>

        <BaseButton block @click="submitDebtPayment">{{ text('finance.submitPayment') }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}

.page__header {
  align-items: start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.page__header p {
  color: var(--text-muted);
  margin: 0 0 8px;
}

.page__header h1 {
  font-family: var(--font-display);
  font-size: clamp(34px, 9vw, 42px);
  margin: 0;
}

.page__actions {
  align-items: center;
  display: grid;
  gap: 12px;
  justify-items: end;
}

.month-switcher {
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  display: flex;
  gap: 12px;
  padding: 6px;
}

.month-switcher button {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  font-size: 20px;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.month-switcher strong {
  min-width: 122px;
  text-align: center;
}

.page__plus {
  align-items: center;
  background: var(--accent);
  border: none;
  border-radius: 999px;
  box-shadow: 0 12px 28px rgba(var(--accent-rgb), 0.28);
  color: var(--accent-contrast);
  cursor: pointer;
  display: inline-flex;
  font-size: 28px;
  height: 50px;
  justify-content: center;
  width: 50px;
}

.insight-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.insight-card {
  display: grid;
  gap: 10px;
}

.insight-card span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.insight-card strong {
  font-size: var(--text-lg);
}

.panel-card {
  display: grid;
  gap: 16px;
}

.panel-card__header {
  align-items: start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.panel-card__header p {
  color: var(--text-muted);
  margin: 0 0 6px;
}

.panel-card__header h2 {
  font-family: var(--font-display);
  font-size: 28px;
  margin: 0;
}

.panel-card__placeholder {
  color: var(--text-muted);
  text-align: center;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-chip {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-muted);
  cursor: pointer;
  min-height: 38px;
  padding: 0 14px;
}

.filter-chip--active {
  background: rgba(var(--accent-rgb), 0.16);
  border-color: rgba(var(--accent-rgb), 0.28);
  color: var(--accent-strong);
}

.activity-group-list,
.debt-list {
  display: grid;
  gap: 14px;
}

.activity-group {
  display: grid;
  gap: 10px;
}

.activity-group__head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.activity-group__head small {
  color: var(--text-muted);
}

.activity-item {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: grid;
  gap: 12px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 14px;
}

.activity-item__icon {
  align-items: center;
  background: rgba(255, 177, 26, 0.12);
  border-radius: 999px;
  color: var(--warning);
  display: inline-flex;
  font-size: 18px;
  font-weight: 700;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.activity-item__icon--income {
  background: rgba(54, 209, 106, 0.12);
  color: var(--success);
}

.activity-item__copy {
  display: grid;
  gap: 4px;
}

.activity-item__copy small {
  color: var(--text-muted);
}

.activity-item__amount {
  font-size: var(--text-md);
}

.activity-item__amount--income {
  color: var(--success);
}

.debt-item {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: grid;
  gap: 12px;
  padding: 16px;
}

.debt-item__head,
.debt-item__footer {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.debt-item__copy {
  display: grid;
  gap: 8px;
}

.debt-item__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.debt-item__amount {
  font-size: var(--text-lg);
}

.debt-item__footer small,
.sheet-hero small,
.payment-account small {
  color: var(--text-muted);
}

.sheet-hero {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}

.sheet-hero h3 {
  font-family: var(--font-display);
  font-size: 30px;
  margin: 0;
}

.sheet-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sheet-stat {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: grid;
  gap: 8px;
  padding: 14px;
}

.sheet-stat span,
.sheet-field span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.sheet-field {
  display: grid;
  gap: 8px;
}

.sheet-field input {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  min-height: 52px;
  padding: 0 14px;
}

.payment-account {
  background: rgba(var(--accent-rgb), 0.12);
  border: 1px solid rgba(var(--accent-rgb), 0.22);
  border-radius: var(--radius-md);
  display: grid;
  gap: 6px;
  padding: 14px;
}

.page__error {
  color: var(--danger);
  margin: 0;
}

@media (max-width: 720px) {
  .page__header,
  .debt-item__head,
  .debt-item__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .page__actions,
  .month-switcher {
    width: 100%;
  }

  .month-switcher strong {
    min-width: 0;
    flex: 1;
  }

  .insight-grid,
  .sheet-grid {
    grid-template-columns: 1fr;
  }

  .activity-item {
    grid-template-columns: auto 1fr;
  }

  .activity-item__amount {
    grid-column: 2;
  }
}
</style>
