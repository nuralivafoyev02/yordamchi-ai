<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import { apiClient } from '../../shared/api/client';
import { useSessionStore } from '../../app/stores/session';

const props = defineProps<{
  date: string;
  mode: 'debt' | 'expense' | 'plan';
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const sessionStore = useSessionStore();
const errorMessage = ref<string | null>(null);

const form = reactive({
  amount: '',
  note: '',
  title: '',
});

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.amount = '';
      form.note = '';
      form.title = '';
    }
  },
);

const heading = computed(() => {
  if (props.mode === 'plan') return 'Create plan';
  if (props.mode === 'expense') return 'Create expense';
  return 'Create debt';
});

async function submit() {
  try {
    errorMessage.value = null;
    const profile = sessionStore.profile as Record<string, unknown> | null;
    const dashboard = sessionStore.dashboard as Record<string, unknown> | null;
    const accounts = (dashboard?.accounts as Array<Record<string, unknown>> | undefined) ?? [];
    const uzsAccount = accounts.find((item) => item.currency === 'UZS');

    if (props.mode === 'plan') {
      await apiClient.post('/api/v1/plans', {
        dueAt: `${props.date}T09:00:00.000Z`,
        priority: 'medium',
        reminderOffsetMinutes: 60,
        repeatRule: 'none',
        scheduledDate: props.date,
        scheduledTime: '09:00',
        status: 'pending',
        timezone: String(profile?.timezone ?? 'Asia/Tashkent'),
        title: form.title || 'New plan',
      });
    }

    if (props.mode === 'expense' && uzsAccount) {
      await apiClient.post('/api/v1/transactions', {
        accountId: uzsAccount.id,
        amount: Number(form.amount),
        currency: 'UZS',
        direction: 'expense',
        note: form.note,
        occurredAt: `${props.date}T09:00:00.000Z`,
        status: 'posted',
      });
    }

    if (props.mode === 'debt') {
      await apiClient.post('/api/v1/debts', {
        amount: Number(form.amount),
        counterpartyName: form.title || 'Counterparty',
        currency: 'UZS',
        direction: 'borrowed',
        dueAt: `${props.date}T09:00:00.000Z`,
        issuedAt: new Date().toISOString(),
        note: form.note,
      });
    }

    await sessionStore.refreshBootstrap();
    emit('saved');
    emit('close');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to save item';
  }
}
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <BaseCard class="modal">
      <h3>{{ heading }}</h3>
      <label v-if="mode !== 'expense'">
        <span>{{ mode === 'plan' ? 'Title' : 'Counterparty' }}</span>
        <input v-model="form.title" />
      </label>
      <label v-if="mode !== 'plan'">
        <span>Amount (UZS)</span>
        <input v-model="form.amount" inputmode="decimal" />
      </label>
      <label>
        <span>{{ mode === 'plan' ? 'Description' : 'Note' }}</span>
        <input v-model="form.note" />
      </label>
      <div class="modal__actions">
        <BaseButton variant="ghost" @click="emit('close')">Cancel</BaseButton>
        <BaseButton @click="submit">Save</BaseButton>
      </div>
      <p v-if="errorMessage" class="modal__error">{{ errorMessage }}</p>
    </BaseCard>
  </div>
</template>

<style scoped>
.modal-backdrop {
  align-items: end;
  background: rgba(17, 32, 51, 0.24);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 16px;
  position: fixed;
  z-index: 40;
}

.modal {
  display: grid;
  gap: 14px;
  max-width: 520px;
  width: 100%;
}

h3 {
  font-family: var(--font-display);
  margin: 0;
}

label {
  display: grid;
  gap: 8px;
}

span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

input {
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  min-height: 48px;
  padding: 0 14px;
}

.modal__actions {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
}

.modal__error {
  color: var(--danger);
  font-size: var(--text-sm);
  margin: 0;
}
</style>
