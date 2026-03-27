<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseEmptyState from '../../shared/components/BaseEmptyState.vue';
import SectionHeader from '../../shared/components/SectionHeader.vue';
import { useToast } from '../../composables/useToast';
import { apiClient } from '../../shared/api/client';
import { useText } from '../../shared/composables/useText';

const { text } = useText();
const toast = useToast();
const overview = ref<Record<string, number> | null>(null);
const form = reactive({
  months: 1,
  telegramUserId: '',
});

async function loadOverview() {
  try {
    overview.value = (await apiClient.get('/api/v1/admin/overview')) as Record<string, number>;
  } catch (error) {
    toast.show({
      message: error instanceof Error ? error.message : text('errors.generic'),
      variant: 'error',
    });
  }
}

async function grantPremium() {
  try {
    await apiClient.post('/api/v1/admin/subscriptions/grant', {
      months: form.months,
      targetTelegramUserId: Number(form.telegramUserId),
    });
    toast.show({
      message: text('admin.premiumGranted'),
      variant: 'success',
    });
    await loadOverview();
  } catch (error) {
    toast.show({
      message: error instanceof Error ? error.message : text('errors.generic'),
      variant: 'error',
    });
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
          <span>{{ text('admin.totalUsers') }}</span>
          <strong>{{ overview.totalUsers }}</strong>
        </article>
        <article>
          <span>{{ text('admin.activePremiumUsers') }}</span>
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
          <span>{{ text('admin.userIdLabel') }}</span>
          <input v-model="form.telegramUserId" inputmode="numeric" />
        </label>
        <label>
          <span>{{ text('admin.monthsLabel') }}</span>
          <input v-model.number="form.months" inputmode="numeric" type="number" />
        </label>
        <BaseButton block @click="grantPremium">{{ text('admin.grantPremium') }}</BaseButton>
        <p class="hint">{{ text('admin.grantHint') }}</p>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
}

.overview-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}

article {
  background: var(--surface-strong);
  border-radius: var(--radius-md);
  padding: 12px;
}

span {
  color: var(--tg-hint);
  display: block;
  font-size: var(--text-xs);
  margin-bottom: 4px;
}

strong {
  font-size: var(--text-lg);
  font-weight: var(--weight-interactive);
}

.admin-form {
  display: grid;
  gap: 10px;
}

label {
  display: grid;
  gap: 6px;
}

input {
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--tg-text);
  min-height: 40px;
  padding: 0 14px;
}

.hint {
  color: var(--tg-hint);
  font-size: var(--text-xs);
  margin: 0;
}
</style>
