<script setup lang="ts">
import type { CalendarDayDetails, CalendarMonthSnapshot, DashboardSnapshot, UserProfileSnapshot } from '@yordamchi/shared';
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
const { text } = useText();
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
const modalMode = ref<'debt' | 'expense' | 'plan'>('plan');

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
  <div class="page">
    <template v-if="sessionStore.error">
      <BaseEmptyState :description="sessionStore.error" :title="text('errors.generic')" />
    </template>

    <template v-else-if="!sessionStore.bootstrapLoaded">
      <LoadingBlock />
      <LoadingBlock />
    </template>

    <template v-else>
      <header class="page__header">
        <div>
          <h1>{{ text('tabs.home') }}</h1>
          <p>{{ text('home.heroSubtitle') }}</p>
        </div>

        <button class="page__plus" type="button" @click="modalMode = 'plan'; modalOpen = true">+</button>
      </header>

      <div class="page__status">
        <StatusBadge :tone="profile?.subscription.isPremium ? 'premium' : 'info'">
          {{ profile?.subscription.isPremium ? text('common.premium') : text('common.free') }}
        </StatusBadge>
      </div>

      <CalendarWidget
        :days="calendarDays"
        :month-start="monthStart"
        :selected-date="selectedDate"
        @select="selectedDate = $event"
        @shift="shiftMonth"
      />
      <p v-if="calendarError" class="page__error">{{ calendarError }}</p>

      <DayDrawer :selected-day="selectedDay" @create="modalMode = $event; modalOpen = true" />

      <BaseCard class="plans-card">
        <div class="plans-card__header">
          <div>
            <p>{{ text('common.upcoming') }}</p>
            <h2>{{ text('home.todayPlan') }}</h2>
          </div>
          <span>{{ dashboard.upcomingPlans.length }}</span>
        </div>

        <ul v-if="dashboard.upcomingPlans.length" class="plans-list">
          <li v-for="plan in dashboard.upcomingPlans" :key="plan.id">
            <div>
              <strong>{{ plan.title }}</strong>
              <small>{{ plan.due_at }}</small>
            </div>
            <StatusBadge :tone="plan.priority === 'high' ? 'danger' : plan.priority === 'medium' ? 'warning' : 'info'">
              {{ plan.priority }}
            </StatusBadge>
          </li>
        </ul>
        <BaseEmptyState v-else :description="text('home.empty')" :title="text('common.plan')" />
      </BaseCard>

      <PremiumUpsell v-if="!profile?.subscription.isPremium" @cta="openPremium" />
    </template>

    <DayEntryModal :date="selectedDate ?? monthStart" :mode="modalMode" :open="modalOpen" @close="modalOpen = false" @saved="handleEntrySaved" />
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

.page__header h1 {
  font-size: var(--text-lg);
  font-weight: var(--weight-interactive);
  margin: 0 0 4px;
}

.page__header p {
  color: var(--tg-hint);
  font-size: var(--text-body);
  margin: 0;
  max-width: 28ch;
}

.page__status {
  margin-top: -6px;
}

.page__plus {
  align-items: center;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--tg-text);
  cursor: pointer;
  display: inline-flex;
  font-size: 20px;
  height: 36px;
  justify-content: center;
  line-height: 1;
  width: 36px;
}

.plans-card {
  display: grid;
  gap: 10px;
}

.plans-card__header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.plans-card__header p {
  color: var(--tg-hint);
  font-size: var(--text-section);
  letter-spacing: 0.08em;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.plans-card__header h2 {
  font-size: var(--text-lg);
  font-weight: var(--weight-interactive);
  margin: 0;
}

.plans-card__header span {
  align-items: center;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: 999px;
  display: inline-flex;
  font-size: var(--text-xs);
  font-weight: var(--weight-interactive);
  height: 24px;
  justify-content: center;
  min-width: 24px;
  padding: 0 8px;
}

.plans-list {
  display: grid;
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0;
}

.plans-list li {
  align-items: center;
  border-top: 1px solid var(--divider);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 10px 0;
}

.plans-list li:first-child {
  border-top: none;
}

.plans-list strong {
  display: block;
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
  margin-bottom: 2px;
}

.plans-list small {
  color: var(--tg-hint);
  font-size: var(--text-xs);
}

.page__error {
  color: var(--danger);
  font-size: var(--text-xs);
  margin-top: -4px;
}
</style>
