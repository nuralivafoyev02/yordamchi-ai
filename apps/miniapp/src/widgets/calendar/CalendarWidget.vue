<script setup lang="ts">
import { computed } from 'vue';

interface CalendarDay {
  date: string;
  hasDebtDue: boolean;
  hasLargeExpense: boolean;
  hasPlans: boolean;
  hasReminders: boolean;
  items: unknown[];
}

const props = defineProps<{
  days: CalendarDay[];
  monthStart: string;
  selectedDate?: string | null;
}>();

const emit = defineEmits<{
  select: [date: string];
}>();

const calendarCells = computed(() => {
  const startDate = new Date(`${props.monthStart}T12:00:00.000Z`);
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1, 12, 0, 0));
  const firstWeekday = (firstDay.getUTCDay() + 6) % 7;
  const lastDay = new Date(Date.UTC(year, month + 1, 0, 12, 0, 0)).getUTCDate();
  const lookup = new Map(props.days.map((day) => [day.date, day]));
  const cells: Array<{ currentMonth: boolean; iso: string; meta?: CalendarDay }> = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ currentMonth: false, iso: `empty-${index}` });
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ currentMonth: true, iso, meta: lookup.get(iso) });
  }

  return cells;
});
</script>

<template>
  <div class="calendar">
    <div class="calendar__weekdays">
      <span>Mo</span>
      <span>Tu</span>
      <span>We</span>
      <span>Th</span>
      <span>Fr</span>
      <span>Sa</span>
      <span>Su</span>
    </div>

    <div class="calendar__grid">
      <button
        v-for="cell in calendarCells"
        :key="cell.iso"
        :class="[
          'calendar__cell',
          {
            'calendar__cell--active': cell.iso === selectedDate,
            'calendar__cell--empty': !cell.currentMonth,
          },
        ]"
        :disabled="!cell.currentMonth"
        type="button"
        @click="cell.currentMonth && emit('select', cell.iso)"
      >
        <span class="calendar__number">{{ cell.currentMonth ? Number(cell.iso.slice(-2)) : '' }}</span>
        <span class="calendar__dots">
          <i v-if="cell.meta?.hasPlans" class="dot dot--plan" />
          <i v-if="cell.meta?.hasReminders" class="dot dot--reminder" />
          <i v-if="cell.meta?.hasDebtDue" class="dot dot--debt" />
          <i v-if="cell.meta?.hasLargeExpense" class="dot dot--expense" />
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  display: grid;
  gap: 14px;
}

.calendar__weekdays,
.calendar__grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(7, 1fr);
}

.calendar__weekdays span {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
  text-align: center;
}

.calendar__cell {
  background: var(--surface-strong);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  display: grid;
  gap: 10px;
  min-height: 74px;
  padding: 10px;
  text-align: left;
}

.calendar__cell--active {
  border-color: rgba(31, 114, 255, 0.35);
  box-shadow: inset 0 0 0 1px rgba(31, 114, 255, 0.18);
}

.calendar__cell--empty {
  background: transparent;
  border-color: transparent;
}

.calendar__number {
  font-weight: 800;
}

.calendar__dots {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dot {
  border-radius: 999px;
  display: inline-block;
  height: 8px;
  width: 8px;
}

.dot--plan {
  background: var(--accent);
}

.dot--reminder {
  background: var(--warning);
}

.dot--debt {
  background: var(--danger);
}

.dot--expense {
  background: #7f56d9;
}
</style>
