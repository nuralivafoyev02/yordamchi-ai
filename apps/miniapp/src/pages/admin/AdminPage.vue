<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseEmptyState from '../../shared/components/BaseEmptyState.vue';
import SectionHeader from '../../shared/components/SectionHeader.vue';
import { apiClient } from '../../shared/api/client';
import { useText } from '../../shared/composables/useText';

const { text } = useText();
const overview = ref<Record<string, number> | null>(null);
const form = reactive({
  months: 1,
  telegramUserId: '',
});
const status = ref('');

async function loadOverview() {
  try {
    overview.value = (await apiClient.get('/api/v1/admin/overview')) as Record<string, number>;
  } catch (error) {
    status.value = error instanceof Error ? error.message : 'Unable to load admin overview';
  }
}

async function grantPremium() {
  try {
    await apiClient.post('/api/v1/admin/subscriptions/grant', {
      months: form.months,
      targetTelegramUserId: Number(form.telegramUserId),
    });
    status.value = 'Premium granted successfully.';
    await loadOverview();
  } catch (error) {
    status.value = error instanceof Error ? error.message : 'Unable to grant premium';
  }
}

onMounted(() => {
  void loadOverview();
});
</script>

<template>
  <div class="page">
    <BaseCard>
      <SectionHeader :subtitle="text('admin.diagnostics')" :title="text('admin.title')" />
      <div v-if="overview" class="overview-grid">
        <article>
          <span>Total users</span>
          <strong>{{ overview.totalUsers }}</strong>
        </article>
        <article>
          <span>Active premium</span>
          <strong>{{ overview.activePremiumUsers }}</strong>
        </article>
        <article>
          <span>{{ text('admin.pendingReminders') }}</span>
          <strong>{{ overview.pendingReminders }}</strong>
        </article>
        <article>
          <span>{{ text('admin.recentErrors') }}</span>
          <strong>{{ overview.recentErrors }}</strong>
        </article>
      </div>
      <BaseEmptyState v-else :description="text('common.loading')" :title="text('admin.title')" />
    </BaseCard>

    <BaseCard>
      <SectionHeader :subtitle="text('admin.grantPremium')" :title="text('common.premium')" />
      <div class="admin-form">
        <label>
          <span>Telegram user ID</span>
          <input v-model="form.telegramUserId" inputmode="numeric" />
        </label>
        <label>
          <span>Months</span>
          <input v-model.number="form.months" inputmode="numeric" type="number" />
        </label>
        <BaseButton block @click="grantPremium">{{ text('admin.grantPremium') }}</BaseButton>
        <p class="hint">Use the Telegram numeric user ID. The Worker resolves the internal user automatically.</p>
        <p v-if="status" class="status">{{ status }}</p>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 18px;
}

.overview-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}

article {
  background: var(--surface-strong);
  border-radius: var(--radius-md);
  padding: 16px;
}

span {
  color: var(--text-muted);
  display: block;
  font-size: var(--text-sm);
  margin-bottom: 8px;
}

strong {
  font-family: var(--font-display);
  font-size: 24px;
}

.admin-form {
  display: grid;
  gap: 14px;
}

label {
  display: grid;
  gap: 8px;
}

input {
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  min-height: 48px;
  padding: 0 14px;
}

.hint,
.status {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0;
}
</style>
