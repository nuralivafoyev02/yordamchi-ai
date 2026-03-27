<script setup lang="ts">
import type {
  CategoryLimitSnapshot,
  CategorySnapshot,
  CurrencyCode,
  DashboardAccount,
  DashboardDebt,
  DashboardSnapshot,
  UserProfileSnapshot,
} from '@yordamchi/shared';
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../../app/stores/session';
import { useToast } from '../../composables/useToast';
import DayEntryModal from '../../features/calendar-entry/DayEntryModal.vue';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseEmptyState from '../../shared/components/BaseEmptyState.vue';
import BaseModal from '../../shared/components/BaseModal.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';
import { apiClient } from '../../shared/api/client';
import { useText } from '../../shared/composables/useText';
import FinanceOverview from '../../widgets/finance-overview/FinanceOverview.vue';

interface FinanceSummaryItem {
  direction: 'expense' | 'income';
  note: string | null;
  occurred_at: string;
  original_amount: number;
  original_currency: CurrencyCode;
  status: string;
}

type ActivityFilter = 'all' | 'expense' | 'income';
type FinanceSection = 'debts' | 'history' | 'limits' | 'overview';

const sessionStore = useSessionStore();
const router = useRouter();
const { locale, text } = useText();
const toast = useToast();

const activeFilter = ref<ActivityFilter>('all');
const activeSection = ref<FinanceSection>('overview');
const financeError = ref('');
const financeItems = ref<FinanceSummaryItem[]>([]);
const financeLoading = ref(false);
const limitItems = ref<CategoryLimitSnapshot[]>([]);
const limitsLoading = ref(false);
const limitsError = ref('');
const categoryOptions = ref<CategorySnapshot[]>([]);
const modalOpen = ref(false);
const modalMode = ref<'debt' | 'expense' | 'income' | 'plan'>('expense');
const monthStart = ref(startOfMonth(new Date()));
const paymentAmount = ref('');
const paymentError = ref('');
const paymentNote = ref('');
const selectedAccount = ref<DashboardAccount | null>(null);
const selectedDebt = ref<DashboardDebt | null>(null);
const limitModalOpen = ref(false);
const limitModalBusy = ref(false);
const limitArchiveCandidateId = ref<string | null>(null);
const editingLimitId = ref<string | null>(null);
const limitForm = reactive({
  amount: '',
  categoryId: '',
  currency: 'UZS' as CurrencyCode,
  warningThresholdPercent: 80,
});

const emptyDashboard: DashboardSnapshot = {
  accounts: [],
  monthSummary: {},
  openDebts: [],
  todayPlans: [],
  upcomingPlans: [],
};

const dashboard = computed(() => sessionStore.dashboard ?? emptyDashboard);
const profile = computed<UserProfileSnapshot | null>(() => sessionStore.profile);
const isPremium = computed(() => Boolean(profile.value?.subscription.isPremium));
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
const expenseCategories = computed(() => categoryOptions.value.filter((item) => item.kind !== 'income'));
const limitAlertsCount = computed(() => limitItems.value.filter((item) => item.status !== 'safe' && item.isActive).length);
const exceededLimitCount = computed(() => limitItems.value.filter((item) => item.status === 'exceeded' && item.isActive).length);

const activityFilters = computed(() => [
  { label: text('finance.filterAll'), value: 'all' as const },
  { label: text('finance.filterIncome'), value: 'income' as const },
  { label: text('finance.filterExpense'), value: 'expense' as const },
]);

const financeSections = computed(() => [
  { label: text('finance.monthlyOverview'), value: 'overview' as const },
  { label: text('finance.activityFeed'), value: 'history' as const },
  { label: text('finance.debtBook'), value: 'debts' as const },
  { label: text('finance.limits'), value: 'limits' as const },
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
    label: text('finance.limitFlagged'),
    tone: limitAlertsCount.value ? 'danger' as const : 'info' as const,
    value: String(limitAlertsCount.value),
  },
  {
    label: text('finance.openDebtCount'),
    tone: dashboard.value.openDebts.length ? 'warning' as const : 'info' as const,
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

const editingLimit = computed(() => limitItems.value.find((item) => item.id === editingLimitId.value) ?? null);

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

  if (diffDays < 0) return 'danger' as const;
  if (diffDays === 0) return 'warning' as const;
  if (diffDays <= 3) return 'info' as const;
  return 'success' as const;
}

function dueLabel(debt: DashboardDebt) {
  if (!debt.due_at) {
    return text('finance.debtBookHint');
  }

  const due = new Date(debt.due_at);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const diffDays = Math.round((startDue - startToday) / 86400000);

  if (diffDays < 0) return text('finance.overdue');
  if (diffDays === 0) return text('finance.dueToday');
  if (diffDays <= 3) return text('finance.dueSoon');
  return formatCalendarDate(debt.due_at);
}

function debtDirectionLabel(debt: DashboardDebt) {
  return debt.direction === 'borrowed' ? text('finance.borrowed') : text('finance.lent');
}

function limitTone(limit: CategoryLimitSnapshot) {
  switch (limit.status) {
    case 'exceeded':
      return 'danger' as const;
    case 'warning':
      return 'warning' as const;
    default:
      return 'success' as const;
  }
}

function limitStatusLabel(limit: CategoryLimitSnapshot) {
  switch (limit.status) {
    case 'exceeded':
      return text('finance.limitExceeded');
    case 'warning':
      return text('finance.limitWarning');
    default:
      return text('finance.limitSafe');
  }
}

function resolveCategoryName(category: CategorySnapshot) {
  const key = `categories.${category.slug}`;
  const localized = text(key);
  return localized === key ? category.name : localized;
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

async function ensureCategoriesLoaded() {
  if (categoryOptions.value.length) {
    return;
  }

  const response = await apiClient.get<{ categories: CategorySnapshot[] }>('/api/v1/categories');
  categoryOptions.value = (response.categories ?? []).filter((item) => item.kind !== 'income');
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

async function loadLimits() {
  if (!sessionStore.token || !isPremium.value) {
    limitItems.value = [];
    return;
  }

  try {
    limitsError.value = '';
    limitsLoading.value = true;
    const response = await apiClient.get<{ items: CategoryLimitSnapshot[] }>(`/api/v1/limits?month=${monthStart.value}`);
    limitItems.value = response.items ?? [];
  } catch (error) {
    limitsError.value = error instanceof Error ? error.message : text('errors.generic');
  } finally {
    limitsLoading.value = false;
  }
}

function openLimitModal(limit?: CategoryLimitSnapshot) {
  if (!isPremium.value) {
    toast.show({
      message: text('premium.cta'),
      variant: 'warning',
    });
    void router.push('/profile');
    return;
  }

  void ensureCategoriesLoaded()
    .then(() => {
      editingLimitId.value = limit?.id ?? null;
      limitArchiveCandidateId.value = null;
      limitForm.amount = limit ? String(limit.limitAmount) : '';
      limitForm.categoryId = limit?.category.id ?? expenseCategories.value[0]?.id ?? '';
      limitForm.currency = limit?.currency ?? profile.value?.baseCurrency ?? 'UZS';
      limitForm.warningThresholdPercent = Math.round(limit?.warningThresholdPercent ?? 80);
      limitModalOpen.value = true;
    })
    .catch((error) => {
      toast.show({
        message: error instanceof Error ? error.message : text('errors.generic'),
        variant: 'error',
      });
    });
}

async function saveLimit() {
  try {
    const amount = Number(limitForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(text('finance.invalidAmount'));
    }

    if (!limitForm.categoryId) {
      throw new Error(text('finance.limitCategory'));
    }

    limitModalBusy.value = true;

    if (editingLimitId.value) {
      await apiClient.patch(`/api/v1/limits/${editingLimitId.value}`, {
        amount,
        categoryId: limitForm.categoryId,
        currency: limitForm.currency,
        monthStart: monthStart.value,
        warningThresholdPercent: limitForm.warningThresholdPercent,
      });
    } else {
      await apiClient.post('/api/v1/limits', {
        amount,
        categoryId: limitForm.categoryId,
        currency: limitForm.currency,
        monthStart: monthStart.value,
        warningThresholdPercent: limitForm.warningThresholdPercent,
      });
    }

    await loadLimits();
    limitModalOpen.value = false;
    toast.show({
      message: text('bot.limitCreated'),
      variant: 'success',
    });
  } catch (error) {
    toast.show({
      message: error instanceof Error ? error.message : text('errors.generic'),
      variant: 'error',
    });
  } finally {
    limitModalBusy.value = false;
  }
}

async function archiveLimit() {
  if (!editingLimitId.value) {
    return;
  }

  if (limitArchiveCandidateId.value !== editingLimitId.value) {
    limitArchiveCandidateId.value = editingLimitId.value;
    return;
  }

  try {
    limitModalBusy.value = true;
    await apiClient.patch(`/api/v1/limits/${editingLimitId.value}/archive`, {});
    await loadLimits();
    limitModalOpen.value = false;
    editingLimitId.value = null;
    limitArchiveCandidateId.value = null;
    toast.show({
      message: text('common.saved'),
      variant: 'success',
    });
  } catch (error) {
    toast.show({
      message: error instanceof Error ? error.message : text('errors.generic'),
      variant: 'error',
    });
  } finally {
    limitModalBusy.value = false;
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
    toast.show({
      message: text('common.saved'),
      variant: 'success',
    });
    selectedDebt.value = null;
  } catch (error) {
    paymentError.value = error instanceof Error ? error.message : text('errors.generic');
    toast.show({
      message: paymentError.value,
      variant: 'error',
    });
  }
}

async function handleEntrySaved() {
  await Promise.all([sessionStore.refreshBootstrap(), loadFinanceSummary(), loadLimits()]);
}

watch(
  () => [sessionStore.bootstrapLoaded, sessionStore.token, monthStart.value, isPremium.value] as const,
  async ([loaded, token]) => {
    if (loaded && token) {
      await Promise.all([loadFinanceSummary(), loadLimits()]);
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

    <div class="section-tabs">
      <button
        v-for="item in financeSections"
        :key="item.value"
        :class="['section-tabs__item', { 'section-tabs__item--active': activeSection === item.value }]"
        type="button"
        @click="activeSection = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <template v-if="activeSection === 'overview'">
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
    </template>

    <p v-if="financeError" class="page__error">{{ financeError }}</p>

    <BaseCard v-if="activeSection === 'limits'" class="panel-card">
      <div class="panel-card__header">
        <div>
          <p>{{ text('finance.limitsHint') }}</p>
          <h2>{{ text('finance.limits') }}</h2>
        </div>
        <div class="panel-card__actions">
          <StatusBadge :tone="exceededLimitCount ? 'danger' : limitAlertsCount ? 'warning' : 'info'">
            {{ limitItems.length }}
          </StatusBadge>
          <BaseButton :block="false" variant="secondary" @click="openLimitModal()">{{ text('finance.limitCreate') }}</BaseButton>
        </div>
      </div>

      <div v-if="!isPremium" class="limit-lock">
        <StatusBadge tone="premium">{{ text('common.premium') }}</StatusBadge>
        <p>{{ text('premium.lockedBody') }}</p>
        <BaseButton :block="false" @click="router.push('/profile')">{{ text('premium.cta') }}</BaseButton>
      </div>

      <p v-else-if="limitsError" class="page__error">{{ limitsError }}</p>
      <div v-else-if="limitsLoading" class="panel-card__placeholder">{{ text('common.loading') }}</div>

      <div v-else-if="limitItems.length" class="limit-list">
        <article v-for="limit in limitItems" :key="limit.id" class="limit-item">
          <div class="limit-item__head">
            <div>
              <strong>{{ resolveCategoryName(limit.category) }}</strong>
              <small>{{ formatAmount(limit.limitAmount, limit.currency) }}</small>
            </div>
            <div class="limit-item__badges">
              <StatusBadge :tone="limitTone(limit)">{{ limitStatusLabel(limit) }}</StatusBadge>
              <button class="limit-item__edit" type="button" @click="openLimitModal(limit)">{{ text('common.edit') }}</button>
            </div>
          </div>

          <div class="limit-item__progress">
            <i :class="[`limit-item__progress-bar--${limit.status}`]" :style="{ width: `${Math.min(limit.progressPercent, 100)}%` }" />
          </div>

          <div class="limit-item__meta">
            <span>{{ text('finance.limitSpent') }} · {{ formatAmount(limit.spentAmount, limit.currency) }}</span>
            <span>{{ text('finance.limitRemaining') }} · {{ formatAmount(limit.remainingAmount, limit.currency) }}</span>
          </div>

          <div class="limit-item__footer">
            <small>{{ text('finance.limitThreshold') }} · {{ Math.round(limit.warningThresholdPercent) }}%</small>
            <small>{{ monthLabel }}</small>
          </div>
        </article>
      </div>
      <BaseEmptyState v-else :description="text('finance.limitNoItems')" :title="text('finance.limits')" />
    </BaseCard>

    <BaseCard v-if="activeSection === 'history'" class="panel-card">
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

    <BaseCard v-if="activeSection === 'debts'" class="panel-card">
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
      <div v-if="selectedDebt">
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
      </div>

      <template #footer>
        <BaseButton block @click="submitDebtPayment">{{ text('finance.submitPayment') }}</BaseButton>
      </template>
    </BaseModal>

    <BaseModal :open="limitModalOpen" :title="editingLimit ? text('finance.limitEdit') : text('finance.limitCreate')" @close="limitModalOpen = false">
      <div class="sheet-hero sheet-hero--limit">
        <small>{{ text('finance.limitsHint') }}</small>
        <strong>{{ monthLabel }}</strong>
        <h3>{{ editingLimit ? resolveCategoryName(editingLimit.category) : text('finance.limits') }}</h3>
      </div>

      <label class="sheet-field">
        <span>{{ text('finance.amountLabel') }}</span>
        <input v-model="limitForm.amount" inputmode="decimal" />
      </label>

      <div class="sheet-group">
        <span class="sheet-group__label">{{ text('finance.limitCategory') }}</span>
        <div class="limit-category-row">
          <button
            v-for="category in expenseCategories"
            :key="category.id"
            :class="['choice-chip', { 'choice-chip--active': limitForm.categoryId === category.id }]"
            type="button"
            @click="limitForm.categoryId = category.id"
          >
            <span>{{ category.icon || '•' }}</span>
            <strong>{{ resolveCategoryName(category) }}</strong>
          </button>
        </div>
      </div>

      <div class="sheet-grid">
        <label class="sheet-field">
          <span>{{ text('common.account') }}</span>
          <select v-model="limitForm.currency">
            <option value="UZS">UZS</option>
            <option value="USD">USD</option>
          </select>
        </label>

        <label class="sheet-field">
          <span>{{ text('finance.limitThreshold') }}</span>
          <input v-model.number="limitForm.warningThresholdPercent" inputmode="numeric" max="100" min="1" type="number" />
        </label>
      </div>

      <template #footer>
        <div class="limit-footer">
          <BaseButton variant="ghost" @click="limitModalOpen = false">{{ text('common.cancel') }}</BaseButton>
          <BaseButton v-if="editingLimit" variant="secondary" @click="archiveLimit">
            {{ limitArchiveCandidateId === editingLimitId ? text('common.confirm') : text('finance.limitArchive') }}
          </BaseButton>
          <BaseButton @click="saveLimit">{{ limitModalBusy ? text('common.loading') : text('finance.limitSave') }}</BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
}

.page__header {
  align-items: start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.page__header p {
  color: var(--text-muted);
  font-size: var(--text-section);
  letter-spacing: 0.12em;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.page__header h1 {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  margin: 0;
}

.page__actions {
  align-items: center;
  display: grid;
  gap: 10px;
  justify-items: end;
}

.month-switcher {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 94%, var(--bg) 6%);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  display: flex;
  gap: 8px;
  padding: 4px;
}

.month-switcher button {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  font-size: 16px;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.month-switcher strong {
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
  min-width: 106px;
  text-align: center;
}

.page__plus {
  align-items: center;
  background: var(--hero-gradient);
  border: none;
  border-radius: 999px;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--hero-glow) 52%, transparent);
  color: var(--accent-contrast);
  cursor: pointer;
  display: inline-flex;
  font-size: 20px;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.section-tabs {
  background: color-mix(in srgb, var(--surface) 96%, var(--bg) 4%);
  border: 1px solid var(--border-strong);
  border-radius: 18px;
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 6px;
}

.section-tabs__item {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 14px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--text-xs);
  font-weight: var(--weight-interactive);
  min-height: 34px;
  padding: 0 10px;
}

.section-tabs__item--active {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--accent) 26%, transparent);
  color: var(--accent);
}

.insight-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.insight-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)),
    var(--surface);
  display: grid;
  gap: 10px;
}

.insight-card span {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.insight-card strong {
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
}

.panel-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)),
    var(--surface);
  display: grid;
  gap: 12px;
}

.panel-card__header {
  align-items: start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.panel-card__header p {
  color: var(--text-muted);
  font-size: var(--text-section);
  letter-spacing: 0.12em;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.panel-card__header h2 {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  margin: 0;
}

.panel-card__actions {
  align-items: center;
  display: flex;
  gap: 8px;
}

.panel-card__placeholder {
  color: var(--text-muted);
  font-size: var(--text-body);
}

.limit-lock {
  align-items: start;
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  display: grid;
  gap: 10px;
  padding: 12px;
}

.limit-lock p {
  color: var(--text-muted);
  margin: 0;
}

.limit-list {
  display: grid;
  gap: 10px;
}

.limit-item {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)), var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  display: grid;
  gap: 10px;
  padding: 12px;
}

.limit-item__head,
.debt-item__head,
.panel-card__header {
  align-items: start;
  display: flex;
  justify-content: space-between;
}

.limit-item__head strong,
.debt-item__head strong {
  font-size: var(--text-body);
  margin: 0;
}

.limit-item__head small,
.limit-item__meta span,
.limit-item__footer small,
.activity-group__head small,
.activity-item__copy small,
.debt-item__footer small,
.payment-account small,
.sheet-field span,
.sheet-group__label,
.sheet-hero small,
.sheet-stat span {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.limit-item__badges,
.debt-item__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: end;
}

.limit-item__edit {
  background: transparent;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: var(--text-xs);
  font-weight: var(--weight-interactive);
  padding: 0;
}

.limit-item__progress,
.account-row__progress,
.flow-card__progress {
  background: color-mix(in srgb, var(--tg-hint) 14%, transparent);
  border-radius: 999px;
  height: 6px;
  overflow: hidden;
}

.limit-item__progress i,
.account-row__progress i,
.flow-card__progress i {
  border-radius: inherit;
  display: block;
  height: 100%;
}

.limit-item__progress-bar--safe {
  background: var(--success);
}

.limit-item__progress-bar--warning {
  background: var(--warning);
}

.limit-item__progress-bar--exceeded {
  background: var(--danger);
}

.limit-item__meta,
.limit-item__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  justify-content: space-between;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  color: var(--text);
  cursor: pointer;
  font-size: var(--text-xs);
  font-weight: var(--weight-interactive);
  min-height: 30px;
  padding: 0 12px;
}

.filter-chip--active {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 32%, transparent);
  color: var(--accent);
}

.activity-group-list,
.debt-list {
  display: grid;
  gap: 12px;
}

.activity-group {
  display: grid;
  gap: 8px;
}

.activity-group__head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.activity-item {
  align-items: center;
  border-top: 1px solid var(--divider);
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-height: 52px;
  padding-top: 8px;
}

.activity-item__icon {
  align-items: center;
  background: var(--warning-soft);
  border-radius: 14px;
  color: var(--warning);
  display: inline-flex;
  font-size: var(--text-body);
  height: 36px;
  justify-content: center;
  width: 36px;
}

.activity-item__icon--income {
  background: var(--success-soft);
  color: var(--success);
}

.activity-item__copy {
  display: grid;
  gap: 2px;
}

.activity-item__copy strong,
.debt-item__copy strong,
.sheet-hero strong,
.sheet-stat strong {
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
}

.activity-item__amount {
  color: var(--warning);
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
}

.activity-item__amount--income {
  color: var(--success);
}

.debt-item {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)), var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  display: grid;
  gap: 10px;
  padding: 12px;
}

.debt-item__copy {
  display: grid;
  gap: 6px;
}

.debt-item__amount {
  font-size: var(--text-body);
  text-align: right;
}

.debt-item__footer {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.sheet-hero {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)), var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  display: grid;
  gap: 4px;
  padding: 12px;
}

.sheet-hero h3 {
  font-size: var(--text-lg);
  font-weight: var(--weight-title);
  margin: 0;
}

.sheet-hero--limit {
  gap: 2px;
}

.sheet-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sheet-stat {
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  display: grid;
  gap: 4px;
  padding: 12px;
}

.sheet-field,
.sheet-group {
  display: grid;
  gap: 6px;
}

.sheet-field input,
.sheet-field select {
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text);
  min-height: var(--field-height);
  padding: 0 12px;
}

.payment-account {
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  display: grid;
  gap: 4px;
  padding: 10px 12px;
}

.limit-category-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.choice-chip {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  white-space: nowrap;
}

.choice-chip--active {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 32%, transparent);
  color: var(--accent);
}

.limit-footer {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 560px) {
  .insight-grid,
  .sheet-grid,
  .limit-footer {
    grid-template-columns: 1fr;
  }

  .section-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .page__header,
  .debt-item__footer {
    grid-template-columns: 1fr;
  }

  .page__actions,
  .panel-card__actions {
    justify-items: stretch;
  }
}
</style>
