<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseEmptyState from '../../shared/components/BaseEmptyState.vue';
import LoadingBlock from '../../shared/components/LoadingBlock.vue';
import SectionHeader from '../../shared/components/SectionHeader.vue';
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

const monthStart = ref(new Date().toISOString().slice(0, 7) + '-01');
const calendarDays = ref<Array<Record<string, unknown>>>([]);
const calendarError = ref('');
const selectedDate = ref<string | null>(null);
const modalOpen = ref(false);
const modalMode = ref<'debt' | 'expense' | 'plan'>('plan');

const dashboard = computed(() => (sessionStore.dashboard as Record<string, unknown>) ?? {});
const profile = computed(() => (sessionStore.profile as Record<string, unknown>) ?? {});
const selectedDay = computed(() => calendarDays.value.find((day) => day.date === selectedDate.value) ?? null);

async function loadCalendar() {
  if (!sessionStore.token) {
    return;
  }

  try {
    calendarError.value = '';
    const response = await apiClient.get(`/api/v1/calendar?month=${monthStart.value}`);
    calendarDays.value = (response.days as Array<Record<string, unknown>>) ?? [];
    selectedDate.value = String(calendarDays.value[0]?.date ?? monthStart.value);
  } catch (error) {
    calendarError.value = error instanceof Error ? error.message : 'Unable to load calendar';
  }
}

function shiftMonth(offset: number) {
  const current = new Date(`${monthStart.value}T12:00:00.000Z`);
  current.setUTCMonth(current.getUTCMonth() + offset);
  monthStart.value = current.toISOString().slice(0, 7) + '-01';
  void loadCalendar();
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
    <BaseCard class="hero">
      <div>
        <StatusBadge :tone="(profile.subscription as Record<string, unknown> | undefined)?.isPremium ? 'premium' : 'info'">
          {{ (profile.subscription as Record<string, unknown> | undefined)?.isPremium ? text('common.premium') : text('common.free') }}
        </StatusBadge>
        <h1>{{ text('home.heroTitle') }}</h1>
        <p>{{ text('home.heroSubtitle') }}</p>
      </div>
      <BaseButton variant="secondary">{{ text('common.openMiniApp') }}</BaseButton>
    </BaseCard>

    <template v-if="sessionStore.error">
      <BaseEmptyState :description="sessionStore.error" :title="text('errors.generic')" />
    </template>

    <template v-else-if="!sessionStore.bootstrapLoaded">
      <LoadingBlock />
      <LoadingBlock />
    </template>

    <template v-else>
      <BaseCard>
        <SectionHeader :subtitle="monthStart" :title="text('tabs.home')">
          <div class="month-actions">
            <BaseButton variant="ghost" @click="shiftMonth(-1)">Prev</BaseButton>
            <BaseButton variant="ghost" @click="shiftMonth(1)">Next</BaseButton>
          </div>
        </SectionHeader>
        <CalendarWidget :days="calendarDays" :month-start="monthStart" :selected-date="selectedDate" @select="selectedDate = $event" />
        <p v-if="calendarError" class="page__error">{{ calendarError }}</p>
      </BaseCard>

      <DayDrawer :selected-day="selectedDay" @create="modalMode = $event; modalOpen = true" />

      <BaseCard>
        <SectionHeader :subtitle="text('home.todayPlan')" :title="text('common.upcoming')" />
        <ul v-if="(dashboard.upcomingPlans as Array<unknown> | undefined)?.length" class="upcoming-list">
          <li v-for="plan in (dashboard.upcomingPlans as Array<Record<string, unknown>>)" :key="String(plan.id)">
            <strong>{{ plan.title }}</strong>
            <span>{{ plan.due_at }}</span>
          </li>
        </ul>
        <BaseEmptyState v-else :description="text('home.empty')" :title="text('common.plan')" />
      </BaseCard>

      <PremiumUpsell v-if="!(profile.subscription as Record<string, unknown> | undefined)?.isPremium" />
    </template>

    <DayEntryModal :date="selectedDate ?? monthStart" :mode="modalMode" :open="modalOpen" @close="modalOpen = false" @saved="loadCalendar" />
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 18px;
}

.hero {
  align-items: end;
  background:
    radial-gradient(circle at top right, rgba(31, 114, 255, 0.24), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.72));
  display: grid;
  gap: 18px;
}

h1 {
  font-family: var(--font-display);
  font-size: clamp(28px, 6vw, 42px);
  line-height: 1.02;
  margin: 14px 0 12px;
}

p {
  color: var(--text-muted);
  margin: 0;
  max-width: 42ch;
}

.month-actions {
  display: flex;
  gap: 10px;
}

.upcoming-list {
  display: grid;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.upcoming-list li {
  background: var(--surface-strong);
  border-radius: var(--radius-md);
  display: grid;
  gap: 6px;
  padding: 14px 16px;
}

.upcoming-list span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.page__error {
  color: var(--danger);
  font-size: var(--text-sm);
  margin: 14px 0 0;
}
</style>
