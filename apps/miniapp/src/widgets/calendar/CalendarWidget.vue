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
  display: grid;
  gap: 18px;
}

.calendar-card__top {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.calendar-card__top p {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0 0 6px;
}

.calendar-card__top h2 {
  font-family: var(--font-display);
  font-size: 30px;
  margin: 0;
}

.calendar-card__nav {
  display: flex;
  gap: 10px;
}

.calendar-card__nav button {
  align-items: center;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  font-size: 18px;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.calendar-card__hero {
  align-items: stretch;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) minmax(140px, 0.9fr);
}

.calendar-card__date,
.calendar-card__summary {
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: 20px;
  min-height: 120px;
  padding: 18px;
}

.calendar-card__date {
  display: grid;
  gap: 8px;
}

.calendar-card__date span,
.calendar-card__summary small {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.calendar-card__date strong {
  font-family: var(--font-display);
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
}

.calendar-card__summary {
  align-content: end;
  display: grid;
  gap: 10px;
}

.calendar-card__summary p {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
}

.calendar-card__grid-shell {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 20px;
  display: grid;
  gap: 14px;
  padding: 16px;
}

.calendar-card__weekdays,
.calendar-card__grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-card__weekdays span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.calendar-card__placeholder {
  display: block;
  min-height: 38px;
}

.calendar-card__day {
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 14px;
  color: var(--text);
  cursor: pointer;
  display: inline-flex;
  font-weight: 600;
  height: 38px;
  justify-content: center;
  margin: 0 auto;
  position: relative;
  width: 38px;
}

.calendar-card__day--active {
  background: var(--accent);
  color: #fff;
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
  background: #fff;
}
</style>
