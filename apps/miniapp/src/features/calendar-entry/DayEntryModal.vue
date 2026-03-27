<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { CurrencyCode, DashboardAccount, DebtDirection } from '@yordamchi/shared';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseModal from '../../shared/components/BaseModal.vue';
import { useToast } from '../../composables/useToast';
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
const toast = useToast();

const errorMessage = ref<string | null>(null);
const saving = ref(false);
const amountInput = ref<HTMLInputElement | null>(null);
const titleInput = ref<HTMLInputElement | null>(null);

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
const currencyOptions = computed(() => ['UZS', 'USD'] as const);
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
  async (open) => {
    if (!open) {
      return;
    }

    resetForm();
    await nextTick();
    const target = isPlan.value ? titleInput.value : amountInput.value;
    target?.focus();
    target?.select();
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
    const timezone = sessionStore.profile?.timezone ?? 'UTC';

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
    toast.show({
      message: props.mode === 'plan'
        ? text('bot.planCreated')
        : props.mode === 'debt'
          ? text('bot.debtCreated')
          : text('bot.transactionCreated'),
      variant: 'success',
    });
    emit('saved');
    emit('close');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : text('errors.generic');
    toast.show({
      message: errorMessage.value,
      variant: 'error',
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal :open="open" :title="title" @close="emit('close')">
    <template #header>
      <div class="sheet-header-copy">
        <p>{{ text('finance.quickActions') }}</p>
      </div>
    </template>

    <div v-if="isTransaction || isDebt" class="amount-block">
      <span class="amount-block__currency">{{ selectedAccount?.currency ?? form.currency ?? baseCurrency }}</span>
      <input
        ref="amountInput"
        v-model="form.amount"
        class="amount-block__input"
        inputmode="decimal"
        :placeholder="text('finance.amountLabel')"
      />
    </div>

    <label v-if="isPlan || isDebt" class="sheet-field">
      <span>{{ titleLabel }}</span>
      <input ref="titleInput" v-model="form.title" />
    </label>

    <div v-if="isTransaction && accounts.length" class="sheet-group">
      <span class="sheet-group__label">{{ text('finance.selectAccount') }}</span>
      <div class="chip-row">
        <button
          v-for="account in accounts"
          :key="account.id"
          :class="['choice-chip', { 'choice-chip--active': form.accountId === account.id }]"
          type="button"
          @click="form.accountId = account.id"
        >
          <strong>{{ account.name }}</strong>
          <small>{{ account.currency }}</small>
        </button>
      </div>
    </div>

    <div v-if="isDebt" class="sheet-group">
      <span class="sheet-group__label">{{ text('common.account') }}</span>
      <div class="chip-row chip-row--compact">
        <button
          v-for="currency in currencyOptions"
          :key="currency"
          :class="['choice-chip', 'choice-chip--compact', { 'choice-chip--active': form.currency === currency }]"
          type="button"
          @click="form.currency = currency"
        >
          {{ currency }}
        </button>
      </div>
    </div>

    <div v-if="isDebt" class="sheet-group">
      <span class="sheet-group__label">{{ text('finance.actionDebt') }}</span>
      <div class="chip-row chip-row--compact">
        <button
          v-for="item in debtDirectionOptions"
          :key="item.value"
          :class="['choice-chip', 'choice-chip--compact', { 'choice-chip--active': form.debtDirection === item.value }]"
          type="button"
          @click="form.debtDirection = item.value"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="sheet-grid">
      <label class="sheet-field">
        <span>{{ text('finance.entryDate') }}</span>
        <input v-model="form.entryDate" type="date" />
      </label>

      <label v-if="isDebt" class="sheet-field">
        <span>{{ text('finance.dueDateLabel') }}</span>
        <input v-model="form.dueDate" type="date" />
      </label>
    </div>

    <label class="sheet-field">
      <span>{{ noteLabel }}</span>
      <input v-model="form.note" :placeholder="noteLabel" />
    </label>

    <p v-if="errorMessage" class="modal__error">{{ errorMessage }}</p>

    <template #footer>
      <div class="modal__actions">
        <BaseButton block variant="ghost" @click="emit('close')">{{ text('common.cancel') }}</BaseButton>
        <BaseButton block @click="submit">{{ saving ? text('common.loading') : text('finance.saveEntry') }}</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.sheet-header-copy p {
  color: var(--text-muted);
  font-size: var(--text-section);
  letter-spacing: 0.12em;
  margin: 0;
  text-transform: uppercase;
}

.amount-block {
  background: color-mix(in srgb, var(--surface-soft) 82%, var(--bg) 18%);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 14px 16px;
}

.amount-block__currency {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-interactive);
  letter-spacing: 0.12em;
}

.amount-block__input {
  background: transparent;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--text-muted) 32%, transparent);
  border-radius: 0;
  color: var(--text);
  font-size: 28px;
  font-weight: var(--weight-semibold);
  padding: 0 0 8px;
  text-align: center;
  width: 100%;
}

.sheet-group {
  display: grid;
  gap: 8px;
}

.sheet-group__label {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-interactive);
}

.chip-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.chip-row::-webkit-scrollbar {
  display: none;
}

.chip-row--compact {
  flex-wrap: wrap;
}

.sheet-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sheet-field {
  display: grid;
  gap: 6px;
}

.sheet-field span {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-interactive);
}

.sheet-field input {
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text);
  min-height: var(--field-height);
  padding: 0 14px;
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

.choice-chip strong,
.choice-chip small {
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
}

.choice-chip small {
  color: var(--text-muted);
}

.choice-chip--compact {
  justify-content: center;
}

.choice-chip--active {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border-color: color-mix(in srgb, var(--accent) 32%, transparent);
  color: var(--accent);
}

.modal__error {
  color: var(--danger);
  font-size: var(--text-xs);
  margin: 0;
}

.modal__actions {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.modal__actions :deep(.button) {
  min-height: 44px;
}

@media (max-width: 560px) {
  .sheet-grid,
  .modal__actions {
    grid-template-columns: 1fr;
  }
}
</style>
