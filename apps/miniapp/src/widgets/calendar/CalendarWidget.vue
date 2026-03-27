<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import { useText } from '../../shared/composables/useText';

interface CalendarDay {
  date: string;
  hasDebtDue: boolean;
  hasLargeExpense: boolean;
  hasPlans: boolean;
  hasReminders: boolean;
  items: Array<Record<string, unknown>>;
}

const props = defineProps<{
  days: CalendarDay[];
  monthStart: string;
  selectedDate?: string | null;
}>();

const emit = defineEmits<{
  select: [date: string];
  shift: [offset: number];
}>();

const { locale, text } = useText();

const monthDate = computed(() => new Date(`${props.monthStart}T12:00:00.000Z`));
const selectedValue = computed(() => props.selectedDate ?? props.monthStart);
const selectedDate = computed(() => new Date(`${selectedValue.value}T12:00:00.000Z`));
const selectedDay = computed(() => props.days.find((day) => day.date === selectedValue.value) ?? null);

const monthLabel = computed(() => monthDate.value.toLocaleDateString(locale.value, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}));

const weekdayLabel = computed(() => selectedDate.value.toLocaleDateString(locale.value, {
  weekday: 'long',
  timeZone: 'UTC',
}));

const selectedNumber = computed(() => selectedDate.value.getUTCDate());

const summaryText = computed(() => {
  if (!selectedDay.value?.items.length) {
    return text('home.noEventsToday');
  }

  return `${selectedDay.value.items.length} ${text('common.upcoming').toLowerCase()}`;
});

const weekdayLabels = computed(() => {
  const monday = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));
  return Array.from({ length: 7 }, (_, index) => {
    const labelDate = new Date(monday);
    labelDate.setUTCDate(monday.getUTCDate() + index);
    return labelDate.toLocaleDateString(locale.value, {
      weekday: 'narrow',
      timeZone: 'UTC',
    }).toUpperCase();
  });
});

const calendarCells = computed(() => {
  const start = monthDate.value;
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1, 12, 0, 0));
  const firstWeekday = (firstDay.getUTCDay() + 6) % 7;
  const lastDay = new Date(Date.UTC(year, month + 1, 0, 12, 0, 0)).getUTCDate();
  const lookup = new Map(props.days.map((day) => [day.date, day]));
  const cells: Array<{ currentMonth: boolean; dayNumber?: number; hasItems: boolean; iso: string }> = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ currentMonth: false, hasItems: false, iso: `empty-${index}` });
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      currentMonth: true,
      dayNumber: day,
      hasItems: Boolean(lookup.get(iso)?.items.length),
      iso,
    });
  }

  return cells;
});
</script>

<template>
  <BaseCard class="calendar-card">
    <div class="calendar-card__top">
      <div>
        <p>{{ text('tabs.home') }}</p>
        <h2>{{ monthLabel }}</h2>
      </div>

      <div class="calendar-card__nav">
        <button :aria-label="text('common.previous')" type="button" @click="emit('shift', -1)">‹</button>
        <button :aria-label="text('common.next')" type="button" @click="emit('shift', 1)">›</button>
      </div>
    </div>

    <div class="calendar-card__hero">
      <div class="calendar-card__date">
        <span>{{ weekdayLabel }}</span>
        <strong>{{ selectedNumber }}</strong>
      </div>

      <div class="calendar-card__summary">
        <p>{{ summaryText }}</p>
        <small v-if="selectedDay?.hasPlans">{{ text('common.plan') }}</small>
        <small v-else-if="selectedDay?.hasReminders">{{ text('bot.reminderDue') }}</small>
        <small v-else>{{ text('home.dayAgenda') }}</small>
      </div>
    </div>

    <div class="calendar-card__grid-shell">
      <div class="calendar-card__weekdays">
        <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
      </div>

      <div class="calendar-card__grid">
        <template v-for="cell in calendarCells" :key="cell.iso">
          <span v-if="!cell.currentMonth" class="calendar-card__placeholder" />
          <button
            v-else
            :class="[
              'calendar-card__day',
              {
                'calendar-card__day--active': cell.iso === selectedValue,
                'calendar-card__day--marked': cell.hasItems,
              },
            ]"
            type="button"
            @click="emit('select', cell.iso)"
          >
            {{ cell.dayNumber }}
          </button>
        </template>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.calendar-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)),
    var(--surface);
  display: grid;
  gap: 16px;
  overflow: hidden;
}

.calendar-card__top {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.calendar-card__top p {
  color: var(--text-muted);
  font-size: var(--text-section);
  letter-spacing: 0.12em;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.calendar-card__top h2 {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  margin: 0;
}

.calendar-card__nav {
  display: flex;
  gap: 8px;
}

.calendar-card__nav button {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  font-size: 16px;
  height: 32px;
  justify-content: center;
  width: 32px;
}

.calendar-card__hero {
  align-items: stretch;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) minmax(140px, 0.9fr);
}

.calendar-card__date,
.calendar-card__summary {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)),
    var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  min-height: 104px;
  padding: 14px;
}

.calendar-card__date {
  display: grid;
  gap: 8px;
}

.calendar-card__date span,
.calendar-card__summary small {
  color: var(--tg-hint);
  font-size: var(--text-xs);
}

.calendar-card__date strong {
  font-size: 44px;
  font-weight: var(--weight-title);
  line-height: 1;
}

.calendar-card__summary {
  align-content: end;
  display: grid;
  gap: 10px;
}

.calendar-card__summary p {
  font-size: 14px;
  font-weight: var(--weight-semibold);
  line-height: 1.2;
  margin: 0;
}

.calendar-card__grid-shell {
  background: color-mix(in srgb, var(--surface-soft) 86%, var(--surface) 14%);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  display: grid;
  gap: 10px;
  padding: 12px;
}

.calendar-card__weekdays,
.calendar-card__grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-card__weekdays span {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-interactive);
  text-align: center;
}

.calendar-card__placeholder {
  display: block;
  min-height: 34px;
}

.calendar-card__day {
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
  height: 34px;
  justify-content: center;
  margin: 0 auto;
  position: relative;
  width: 34px;
}

.calendar-card__day--active {
  background: var(--hero-gradient);
  box-shadow: 0 10px 20px color-mix(in srgb, var(--hero-glow) 44%, transparent);
  color: var(--accent-contrast);
}

.calendar-card__day--marked::after {
  background: var(--warning);
  border-radius: 999px;
  bottom: 3px;
  content: '';
  height: 4px;
  position: absolute;
  width: 4px;
}

.calendar-card__day--active.calendar-card__day--marked::after {
  background: var(--tg-button-text);
}

@media (max-width: 420px) {
  .calendar-card__hero {
    grid-template-columns: 1fr;
  }
}
</style>
