<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { CurrencyCode, DashboardAccount, DebtDirection } from '@yordamchi/shared';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import { apiClient } from '../../shared/api/client';
import { useSessionStore } from '../../app/stores/session';
import { useText } from '../../shared/composables/useText';

const props = defineProps<{
  date: string;
  mode: 'debt' | 'expense' | 'income' | 'plan';
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const sessionStore = useSessionStore();
const { text } = useText();

const errorMessage = ref<string | null>(null);
const saving = ref(false);

const form = reactive({
  accountId: '',
  amount: '',
  currency: 'UZS' as CurrencyCode,
  debtDirection: 'borrowed' as DebtDirection,
  dueDate: '',
  entryDate: '',
  note: '',
  title: '',
});

const accounts = computed<DashboardAccount[]>(() => sessionStore.dashboard?.accounts ?? []);
const baseCurrency = computed<CurrencyCode>(() => sessionStore.profile?.baseCurrency ?? 'UZS');
const isDebt = computed(() => props.mode === 'debt');
const isPlan = computed(() => props.mode === 'plan');
const isTransaction = computed(() => props.mode === 'expense' || props.mode === 'income');

const selectedAccount = computed(() => accounts.value.find((item) => item.id === form.accountId) ?? null);

const debtDirectionOptions = computed(() => [
  { label: text('finance.borrowed'), value: 'borrowed' as const },
  { label: text('finance.lent'), value: 'lent' as const },
]);

const title = computed(() => {
  if (props.mode === 'plan') return text('finance.createPlan');
  if (props.mode === 'expense') return text('finance.createExpense');
  if (props.mode === 'income') return text('finance.createIncome');
  return text('finance.createDebt');
});

const noteLabel = computed(() => {
  if (props.mode === 'plan') return text('finance.descriptionLabel');
  if (props.mode === 'income') return text('finance.sourceNoteLabel');
  return text('finance.noteLabel');
});

const titleLabel = computed(() => (props.mode === 'debt' ? text('finance.counterpartyLabel') : text('finance.titleLabel')));

function resolvePreferredAccount() {
  return accounts.value.find((item) => item.currency === baseCurrency.value && item.is_default)
    ?? accounts.value.find((item) => item.is_default)
    ?? accounts.value.find((item) => item.currency === baseCurrency.value)
    ?? accounts.value[0]
    ?? null;
}

function resetForm() {
  const preferredAccount = resolvePreferredAccount();
  form.accountId = preferredAccount?.id ?? '';
  form.amount = '';
  form.currency = preferredAccount?.currency ?? baseCurrency.value;
  form.debtDirection = 'borrowed';
  form.dueDate = props.date;
  form.entryDate = props.date;
  form.note = '';
  form.title = '';
  errorMessage.value = null;
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      resetForm();
    }
  },
  { immediate: true },
);

watch(
  () => form.accountId,
  (accountId) => {
    if (!accountId) {
      return;
    }

    const account = accounts.value.find((item) => item.id === accountId);
    if (account) {
      form.currency = account.currency;
    }
  },
);

function buildIso(date: string, hour = 9, minute = 0) {
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

async function submit() {
  try {
    errorMessage.value = null;
    saving.value = true;
    const timezone = sessionStore.profile?.timezone ?? 'Asia/Tashkent';

    if (!isPlan.value) {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(text('finance.invalidAmount'));
      }
    }

    if (props.mode === 'plan') {
      await apiClient.post('/api/v1/plans', {
        description: form.note.trim() || undefined,
        dueAt: buildIso(form.entryDate),
        priority: 'medium',
        reminderOffsetMinutes: 60,
        repeatRule: 'none',
        scheduledDate: form.entryDate,
        scheduledTime: '09:00',
        status: 'pending',
        timezone,
        title: form.title.trim() || text('common.plan'),
      });
    }

    if (props.mode === 'expense' || props.mode === 'income') {
      if (!selectedAccount.value) {
        throw new Error(accounts.value.length ? text('finance.noAccountSelected') : text('finance.noAccountForTransaction'));
      }

      await apiClient.post('/api/v1/transactions', {
        accountId: selectedAccount.value.id,
        amount: Number(form.amount),
        currency: selectedAccount.value.currency,
        direction: props.mode,
        note: form.note.trim() || undefined,
        occurredAt: buildIso(form.entryDate),
        status: 'posted',
      });
    }

    if (props.mode === 'debt') {
      await apiClient.post('/api/v1/debts', {
        amount: Number(form.amount),
        counterpartyName: form.title.trim() || text('finance.counterpartyLabel'),
        currency: form.currency,
        direction: form.debtDirection,
        dueAt: form.dueDate ? buildIso(form.dueDate) : undefined,
        issuedAt: buildIso(form.entryDate),
        note: form.note.trim() || undefined,
      });
    }

    await sessionStore.refreshBootstrap();
    emit('saved');
    emit('close');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : text('errors.generic');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <BaseCard class="modal">
      <div class="modal__header">
        <div>
          <p>{{ text('finance.quickActions') }}</p>
          <h3>{{ title }}</h3>
        </div>
        <button class="modal__close" type="button" @click="emit('close')">×</button>
      </div>

      <label v-if="isPlan || isDebt" class="sheet-field">
        <span>{{ titleLabel }}</span>
        <input v-model="form.title" />
      </label>

      <div v-if="isTransaction" class="sheet-grid">
        <label class="sheet-field">
          <span>{{ text('finance.selectAccount') }}</span>
          <select v-model="form.accountId">
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ account.name }} · {{ account.currency }}
            </option>
          </select>
        </label>

        <label class="sheet-field">
          <span>{{ text('finance.entryDate') }}</span>
          <input v-model="form.entryDate" type="date" />
        </label>
      </div>

      <div v-if="isDebt" class="sheet-grid">
        <label class="sheet-field">
          <span>{{ text('finance.entryDate') }}</span>
          <input v-model="form.entryDate" type="date" />
        </label>

        <label class="sheet-field">
          <span>{{ text('finance.dueDateLabel') }}</span>
          <input v-model="form.dueDate" type="date" />
        </label>
      </div>

      <div v-if="isDebt" class="direction-list">
        <button
          v-for="item in debtDirectionOptions"
          :key="item.value"
          :class="['direction-chip', { 'direction-chip--active': form.debtDirection === item.value }]"
          type="button"
          @click="form.debtDirection = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-if="isDebt" class="sheet-grid">
        <label class="sheet-field">
          <span>{{ text('finance.amountLabel') }} ({{ form.currency }})</span>
          <input v-model="form.amount" inputmode="decimal" />
        </label>

        <label class="sheet-field">
          <span>{{ text('common.account') }}</span>
          <select v-model="form.currency">
            <option value="UZS">UZS</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </div>

      <div v-if="isTransaction" class="sheet-grid">
        <label class="sheet-field">
          <span>{{ text('finance.amountLabel') }} ({{ selectedAccount?.currency ?? baseCurrency }})</span>
          <input v-model="form.amount" inputmode="decimal" />
        </label>

        <div class="account-pill" v-if="selectedAccount">
          <small>{{ text('common.account') }}</small>
          <strong>{{ selectedAccount.name }}</strong>
        </div>
      </div>

      <label v-if="isPlan" class="sheet-field">
        <span>{{ text('finance.entryDate') }}</span>
        <input v-model="form.entryDate" type="date" />
      </label>

      <label class="sheet-field">
        <span>{{ noteLabel }}</span>
        <input v-model="form.note" />
      </label>

      <p v-if="errorMessage" class="modal__error">{{ errorMessage }}</p>

      <div class="modal__actions">
        <BaseButton block variant="ghost" @click="emit('close')">{{ text('common.cancel') }}</BaseButton>
        <BaseButton block @click="submit">{{ saving ? text('common.loading') : text('finance.saveEntry') }}</BaseButton>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.modal-backdrop {
  align-items: end;
  background: rgba(7, 7, 9, 0.76);
  backdrop-filter: blur(8px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 16px;
  position: fixed;
  z-index: 40;
}

.modal {
  display: grid;
  gap: 16px;
  max-width: 560px;
  width: 100%;
}

.modal__header {
  align-items: start;
  display: flex;
  justify-content: space-between;
}

.modal__header p {
  color: var(--text-muted);
  margin: 0 0 6px;
}

.modal__header h3 {
  font-family: var(--font-display);
  font-size: 28px;
  margin: 0;
}

.modal__close {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  cursor: pointer;
  font-size: 24px;
  height: 42px;
  width: 42px;
}

.sheet-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sheet-field {
  display: grid;
  gap: 8px;
}

.sheet-field span,
.account-pill small {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.sheet-field input,
.sheet-field select {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  min-height: 52px;
  padding: 0 14px;
}

.sheet-field select {
  appearance: none;
}

.direction-list {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.direction-chip {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 700;
  min-height: 46px;
}

.direction-chip--active {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.36);
  color: var(--accent-strong);
}

.account-pill {
  align-content: center;
  background: linear-gradient(180deg, rgba(var(--accent-rgb), 0.12), rgba(var(--accent-rgb), 0.04));
  border: 1px solid rgba(var(--accent-rgb), 0.22);
  border-radius: var(--radius-sm);
  display: grid;
  gap: 6px;
  min-height: 52px;
  padding: 12px 14px;
}

.account-pill strong {
  font-size: var(--text-md);
}

.modal__actions {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.modal__error {
  color: var(--danger);
  font-size: var(--text-sm);
  margin: 0;
}

@media (max-width: 560px) {
  .sheet-grid,
  .modal__actions {
    grid-template-columns: 1fr;
  }
}
</style>
