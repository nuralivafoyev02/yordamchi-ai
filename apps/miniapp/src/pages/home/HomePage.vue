<script setup lang="ts">
import type {
  CalendarDayDetails,
  CalendarDayItem,
  CalendarMonthSnapshot,
  CurrencyCode,
  DashboardSnapshot,
  UserProfileSnapshot,
} from '@yordamchi/shared';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseEmptyState from '../../shared/components/BaseEmptyState.vue';
import LoadingBlock from '../../shared/components/LoadingBlock.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';
import { useText } from '../../shared/composables/useText';
import { apiClient } from '../../shared/api/client';
import { useSessionStore } from '../../app/stores/session';
import CalendarWidget from '../../widgets/calendar/CalendarWidget.vue';
import DayDrawer from '../../widgets/day-drawer/DayDrawer.vue';
import PremiumUpsell from '../../widgets/premium-upsell/PremiumUpsell.vue';
import DayEntryModal from '../../features/calendar-entry/DayEntryModal.vue';

const sessionStore = useSessionStore();
const { locale, text } = useText();
const router = useRouter();

const emptyDashboard: DashboardSnapshot = {
  accounts: [],
  monthSummary: {},
  openDebts: [],
  todayPlans: [],
  upcomingPlans: [],
};

const monthStart = ref(new Date().toISOString().slice(0, 7) + '-01');
const calendarDays = ref<CalendarDayDetails[]>([]);
const calendarError = ref('');
const selectedDate = ref<string | null>(null);
const modalOpen = ref(false);
const modalMode = ref<'debt' | 'expense' | 'income' | 'plan'>('plan');

const dashboard = computed(() => sessionStore.dashboard ?? emptyDashboard);
const profile = computed<UserProfileSnapshot | null>(() => sessionStore.profile);

const selectedDay = computed<CalendarDayDetails | null>(() => {
  if (!selectedDate.value) {
    return null;
  }

  return calendarDays.value.find((day) => day.date === selectedDate.value) ?? {
    date: selectedDate.value,
    hasDebtDue: false,
    hasLargeExpense: false,
    hasPlans: false,
    hasReminders: false,
    items: [],
  };
});

const summaryCurrency = computed<CurrencyCode>(() => {
  if (profile.value?.baseCurrency) {
    return profile.value.baseCurrency;
  }

  return dashboard.value.accounts[0]?.currency ?? 'UZS';
});

const balanceSourceAccounts = computed(() => {
  const matching = dashboard.value.accounts.filter((item) => item.currency === summaryCurrency.value);
  return matching.length ? matching : dashboard.value.accounts.slice(0, 1);
});

const totalBalance = computed(() => balanceSourceAccounts.value.reduce((sum, item) => sum + Number(item.current_balance ?? 0), 0));
const monthIncome = computed(() => dashboard.value.monthSummary[summaryCurrency.value]?.income ?? 0);
const monthExpense = computed(() => dashboard.value.monthSummary[summaryCurrency.value]?.expense ?? 0);
const userInitial = computed(() => String(profile.value?.displayName ?? profile.value?.username ?? 'Y').trim().slice(0, 1).toUpperCase());

const statCards = computed(() => [
  { label: text('finance.monthIncome'), tone: 'success' as const, value: formatMoney(monthIncome.value, summaryCurrency.value) },
  { label: text('finance.monthExpense'), tone: 'warning' as const, value: formatMoney(monthExpense.value, summaryCurrency.value) },
  { label: text('finance.openDebtCount'), tone: dashboard.value.openDebts.length ? 'warning' as const : 'info' as const, value: String(dashboard.value.openDebts.length) },
  { label: text('common.upcoming'), tone: dashboard.value.upcomingPlans.length ? 'premium' as const : 'info' as const, value: String(dashboard.value.upcomingPlans.length) },
]);

const spotlightRows = computed(() => {
  if (selectedDay.value?.items.length) {
    return selectedDay.value.items.slice(0, 4).map((item) => ({
      id: `${item.kind}-${item.id}`,
      meta: formatItemMeta(item),
      title: formatItemTitle(item),
      tone: itemTone(item.kind),
    }));
  }

  return dashboard.value.upcomingPlans.slice(0, 4).map((plan) => ({
    id: plan.id,
    meta: plan.due_at,
    title: plan.title,
    tone: plan.priority === 'high' ? 'danger' as const : plan.priority === 'medium' ? 'warning' as const : 'info' as const,
  }));
});

async function loadCalendar() {
  if (!sessionStore.token) {
    return;
  }

  try {
    calendarError.value = '';
    const response = await apiClient.get<CalendarMonthSnapshot>(`/api/v1/calendar?month=${monthStart.value}`);
    calendarDays.value = response.days ?? [];

    const visibleMonth = monthStart.value.slice(0, 7);
    const todayIso = new Date().toISOString().slice(0, 10);
    const preferredDate = selectedDate.value?.startsWith(visibleMonth)
      ? selectedDate.value
      : todayIso.startsWith(visibleMonth)
        ? todayIso
        : `${visibleMonth}-01`;

    selectedDate.value = preferredDate;
  } catch (error) {
    calendarError.value = error instanceof Error ? error.message : text('errors.generic');
  }
}

function shiftMonth(offset: number) {
  const current = new Date(`${monthStart.value}T12:00:00.000Z`);
  current.setUTCMonth(current.getUTCMonth() + offset);
  monthStart.value = current.toISOString().slice(0, 7) + '-01';
  void loadCalendar();
}

async function handleEntrySaved() {
  await sessionStore.refreshBootstrap();
  await loadCalendar();
}

function openPremium() {
  void router.push('/profile');
}

function openQuickAction(mode: 'debt' | 'expense' | 'income' | 'plan') {
  modalMode.value = mode;
  modalOpen.value = true;
}

function formatMoney(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat(locale.value, {
    currency,
    currencyDisplay: 'symbol',
    maximumFractionDigits: currency === 'UZS' ? 0 : 2,
    minimumFractionDigits: currency === 'UZS' ? 0 : 2,
    style: 'currency',
  }).format(amount);
}

function formatItemTitle(item: CalendarDayItem) {
  return String(item.title ?? item.note ?? item.counterparty_name ?? item.entity_type ?? text('home.dayAgenda'));
}

function formatItemMeta(item: CalendarDayItem) {
  if (item.kind === 'transaction') {
    return `${Number(item.original_amount ?? 0).toLocaleString(locale.value)} ${String(item.original_currency ?? '')}`.trim();
  }

  if (item.kind === 'debt') {
    return `${Number(item.principal_amount ?? 0).toLocaleString(locale.value)} ${String(item.principal_currency ?? '')}`.trim();
  }

  const timestamp = String(item.due_at ?? item.scheduled_for ?? item.occurred_at ?? '');
  return timestamp.includes('T')
    ? new Date(timestamp).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
    : timestamp || text('common.upcoming');
}

function itemTone(kind: CalendarDayItem['kind']) {
  if (kind === 'debt') return 'danger' as const;
  if (kind === 'transaction') return 'warning' as const;
  if (kind === 'reminder') return 'success' as const;
  return 'info' as const;
}

watch(
  () => [sessionStore.bootstrapLoaded, sessionStore.token] as const,
  async ([loaded, token]) => {
    if (loaded && token) {
      await loadCalendar();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="page dashboard-page">
    <template v-if="sessionStore.error">
      <BaseEmptyState :description="sessionStore.error" :title="text('errors.generic')" />
    </template>

    <template v-else-if="!sessionStore.bootstrapLoaded">
      <LoadingBlock />
      <LoadingBlock />
      <LoadingBlock />
    </template>

    <template v-else>
      <header class="dashboard-top">
        <button class="user-chip" type="button" @click="router.push('/profile')">
          <span class="user-chip__avatar">{{ userInitial }}</span>
          <span class="user-chip__copy">
            <strong>{{ profile?.displayName || profile?.username || text('tabs.home') }}</strong>
            <small>@{{ profile?.username || 'yordamchi' }}</small>
          </span>
        </button>

        <div class="dashboard-top__actions">
          <button class="utility-button" type="button" @click="router.push('/finance')">↗</button>
          <button class="utility-button utility-button--accent" type="button" @click="openQuickAction('expense')">＋</button>
        </div>
      </header>

      <BaseCard class="hero-card">
        <div class="hero-card__glow hero-card__glow--accent" />
        <div class="hero-card__glow hero-card__glow--success" />

        <div class="hero-card__head">
          <div>
            <p>{{ text('finance.primaryBalance') }}</p>
            <h1>{{ formatMoney(totalBalance, summaryCurrency) }}</h1>
          </div>

          <StatusBadge :tone="profile?.subscription.isPremium ? 'premium' : 'info'">
            {{ profile?.subscription.isPremium ? text('common.premium') : text('common.free') }}
          </StatusBadge>
        </div>

        <div class="hero-card__meta">
          <span>{{ text('finance.monthIncome') }} · {{ formatMoney(monthIncome, summaryCurrency) }}</span>
          <span>{{ text('finance.monthExpense') }} · {{ formatMoney(monthExpense, summaryCurrency) }}</span>
        </div>

        <div class="hero-card__actions">
          <button class="hero-action" type="button" @click="openQuickAction('income')">
            <span>＋</span>
            <strong>{{ text('finance.actionIncome') }}</strong>
          </button>
          <button class="hero-action" type="button" @click="openQuickAction('expense')">
            <span>−</span>
            <strong>{{ text('finance.actionExpense') }}</strong>
          </button>
          <button class="hero-action" type="button" @click="openQuickAction('debt')">
            <span>↔</span>
            <strong>{{ text('finance.actionDebt') }}</strong>
          </button>
          <button class="hero-action" type="button" @click="openQuickAction('plan')">
            <span>○</span>
            <strong>{{ text('common.plan') }}</strong>
          </button>
        </div>
      </BaseCard>

      <div class="stat-grid">
        <BaseCard v-for="card in statCards" :key="card.label" :class="['stat-card', `stat-card--${card.tone}`]">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <i class="stat-card__accent" />
        </BaseCard>
      </div>

      <CalendarWidget
        :days="calendarDays"
        :month-start="monthStart"
        :selected-date="selectedDate"
        @select="selectedDate = $event"
        @shift="shiftMonth"
      />
      <p v-if="calendarError" class="page__error">{{ calendarError }}</p>

      <DayDrawer :selected-day="selectedDay" @create="openQuickAction($event)" />

      <BaseCard class="signal-card">
        <div class="signal-card__header">
          <div>
            <p>{{ text('common.upcoming') }}</p>
            <h2>{{ selectedDay?.items.length ? text('home.dayAgenda') : text('home.todayPlan') }}</h2>
          </div>
          <StatusBadge tone="info">{{ spotlightRows.length }}</StatusBadge>
        </div>

        <div v-if="spotlightRows.length" class="signal-list">
          <article v-for="item in spotlightRows" :key="item.id" class="signal-row">
            <span :class="['signal-row__dot', `signal-row__dot--${item.tone}`]" />
            <div class="signal-row__copy">
              <strong>{{ item.title }}</strong>
              <small>{{ item.meta }}</small>
            </div>
          </article>
        </div>
        <BaseEmptyState v-else :description="text('home.empty')" :title="text('home.noEventsToday')" />
      </BaseCard>

      <PremiumUpsell v-if="!profile?.subscription.isPremium" @cta="openPremium" />
    </template>

    <DayEntryModal :date="selectedDate ?? monthStart" :mode="modalMode" :open="modalOpen" @close="modalOpen = false" @saved="handleEntrySaved" />
  </div>
</template>

<style scoped>
.dashboard-page {
  gap: 16px;
}

.dashboard-top {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding-top: 2px;
}

.user-chip {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 94%, var(--bg) 6%);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  gap: 10px;
  max-width: calc(100% - 108px);
  padding: 7px 14px 7px 7px;
}

.user-chip__avatar {
  align-items: center;
  background: var(--hero-gradient);
  border-radius: 999px;
  color: var(--accent-contrast);
  display: inline-flex;
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
  height: 34px;
  justify-content: center;
  width: 34px;
}

.user-chip__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
  text-align: left;
}

.user-chip__copy strong {
  font-size: var(--text-body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-chip__copy small {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.dashboard-top__actions {
  display: flex;
  gap: 8px;
}

.utility-button {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: 14px;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  font-size: 16px;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.utility-button--accent {
  background: var(--hero-gradient);
  border-color: transparent;
  color: var(--accent-contrast);
}

.hero-card {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--hero-glow) 34%, transparent), transparent 38%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
    var(--surface);
  display: grid;
  gap: 18px;
  overflow: hidden;
  position: relative;
}

.hero-card__glow {
  border-radius: 999px;
  filter: blur(48px);
  opacity: 0.24;
  position: absolute;
}

.hero-card__glow--accent {
  background: color-mix(in srgb, var(--hero-glow) 54%, transparent);
  height: 180px;
  right: -72px;
  top: -44px;
  width: 180px;
}

.hero-card__glow--success {
  background: color-mix(in srgb, var(--success) 28%, transparent);
  bottom: -58px;
  height: 150px;
  left: -46px;
  width: 150px;
}

.hero-card__head,
.hero-card__meta,
.hero-card__actions {
  position: relative;
  z-index: 1;
}

.hero-card__head {
  align-items: start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.hero-card__head p,
.signal-card__header p {
  color: var(--text-muted);
  font-size: var(--text-section);
  letter-spacing: 0.12em;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.hero-card__head h1 {
  font-size: clamp(28px, 8vw, 36px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.04;
  margin: 0;
}

.hero-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
}

.hero-card__meta span {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  color: var(--text-muted);
  font-size: var(--text-xs);
  padding: 7px 12px;
}

.hero-card__actions {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.hero-action {
  align-items: center;
  background: color-mix(in srgb, var(--surface-soft) 88%, rgba(255, 255, 255, 0.02));
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text);
  cursor: pointer;
  display: grid;
  gap: 7px;
  justify-items: start;
  min-height: 60px;
  padding: 12px;
}

.hero-action span {
  align-items: center;
  background: rgba(var(--accent-rgb), 0.14);
  border-radius: 999px;
  color: var(--accent-strong);
  display: inline-flex;
  font-size: 14px;
  height: 24px;
  justify-content: center;
  width: 24px;
}

.hero-action strong {
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
}

.stat-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stat-card {
  display: grid;
  gap: 10px;
  min-height: 118px;
}

.stat-card__accent {
  border-radius: 999px;
  display: block;
  height: 6px;
  width: 44px;
}

.stat-card--success .stat-card__accent {
  background: linear-gradient(90deg, rgba(24, 217, 122, 0.24), var(--success));
}

.stat-card--warning .stat-card__accent {
  background: linear-gradient(90deg, rgba(245, 200, 76, 0.22), var(--warning));
}

.stat-card--danger .stat-card__accent {
  background: linear-gradient(90deg, rgba(255, 93, 115, 0.22), var(--danger));
}

.stat-card--info .stat-card__accent,
.stat-card--premium .stat-card__accent {
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.2), var(--accent));
}

.stat-card span {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.stat-card strong {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  letter-spacing: -0.02em;
}

.signal-card {
  display: grid;
  gap: 14px;
}

.signal-card__header {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.signal-card__header h2 {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  margin: 0;
}

.signal-list {
  display: grid;
}

.signal-row {
  align-items: center;
  border-top: 1px solid var(--divider);
  display: flex;
  gap: 12px;
  min-height: 58px;
  padding: 12px 0;
}

.signal-row:first-child {
  border-top: none;
}

.signal-row__dot {
  border-radius: 14px;
  flex: 0 0 36px;
  height: 36px;
  position: relative;
}

.signal-row__dot::after {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: inherit;
  content: '';
  inset: 0;
  position: absolute;
}

.signal-row__dot--info {
  background: var(--info-soft);
}

.signal-row__dot--success {
  background: var(--success-soft);
}

.signal-row__dot--warning {
  background: var(--warning-soft);
}

.signal-row__dot--danger {
  background: var(--danger-soft);
}

.signal-row__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.signal-row__copy strong {
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
}

.signal-row__copy small {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.page__error {
  color: var(--danger);
  font-size: var(--text-xs);
  margin-top: -4px;
}

@media (max-width: 420px) {
  .user-chip {
    max-width: calc(100% - 92px);
  }
}
</style>
