<script setup lang="ts">
import type { AdminOverview } from '@yordamchi/shared';
import { onMounted, reactive, ref } from 'vue';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseEmptyState from '../../shared/components/BaseEmptyState.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';
import { useToast } from '../../composables/useToast';
import { apiClient } from '../../shared/api/client';
import { useText } from '../../shared/composables/useText';

const { text } = useText();
const toast = useToast();
const overview = ref<AdminOverview | null>(null);
const loading = ref(false);
const searchQuery = ref('');
const form = reactive({
  months: 1,
  telegramUserId: '',
});

async function loadOverview() {
  try {
    loading.value = true;
    const query = searchQuery.value.trim();
    const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
    overview.value = await apiClient.get<AdminOverview>(`/api/v1/admin/overview${suffix}`);
  } catch (error) {
    toast.show({
      message: error instanceof Error ? error.message : text('errors.generic'),
      variant: 'error',
    });
  } finally {
    loading.value = false;
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
    form.telegramUserId = '';
    await loadOverview();
  } catch (error) {
    toast.show({
      message: error instanceof Error ? error.message : text('errors.generic'),
      variant: 'error',
    });
  }
}

function relativeTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(date);
}

onMounted(() => {
  void loadOverview();
});
</script>

<template>
  <div class="page">
    <header class="page__header">
      <div>
        <p>{{ text('admin.diagnostics') }}</p>
        <h1>{{ text('admin.title') }}</h1>
      </div>
      <BaseButton :block="false" variant="secondary" @click="loadOverview">{{ text('common.retry') }}</BaseButton>
    </header>

    <BaseCard class="toolbar-card">
      <label class="toolbar-field">
        <span>{{ text('admin.searchPlaceholder') }}</span>
        <input v-model="searchQuery" :placeholder="text('admin.searchPlaceholder')" @keyup.enter="loadOverview" />
      </label>
      <BaseButton :block="false" @click="loadOverview">{{ text('admin.searchAction') }}</BaseButton>
    </BaseCard>

    <div v-if="overview" class="metric-grid">
      <BaseCard class="metric-card">
        <span>{{ text('admin.totalUsers') }}</span>
        <strong>{{ overview.totalUsers }}</strong>
      </BaseCard>
      <BaseCard class="metric-card">
        <span>{{ text('admin.activePremiumUsers') }}</span>
        <strong>{{ overview.activePremiumUsers }}</strong>
      </BaseCard>
      <BaseCard class="metric-card">
        <span>{{ text('admin.pendingReminders') }}</span>
        <strong>{{ overview.pendingReminders }}</strong>
      </BaseCard>
      <BaseCard class="metric-card">
        <span>{{ text('admin.recentErrors') }}</span>
        <strong>{{ overview.recentErrors }}</strong>
      </BaseCard>
    </div>

    <BaseCard>
      <div class="section-head">
        <div>
          <p>{{ text('admin.grantPremium') }}</p>
          <h2>{{ text('common.premium') }}</h2>
        </div>
      </div>
      <div class="grant-grid">
        <label class="toolbar-field">
          <span>{{ text('admin.userIdLabel') }}</span>
          <input v-model="form.telegramUserId" inputmode="numeric" />
        </label>
        <label class="toolbar-field">
          <span>{{ text('admin.monthsLabel') }}</span>
          <input v-model.number="form.months" inputmode="numeric" type="number" />
        </label>
      </div>
      <BaseButton block @click="grantPremium">{{ text('admin.grantPremium') }}</BaseButton>
      <p class="hint">{{ text('admin.grantHint') }}</p>
    </BaseCard>

    <BaseCard>
      <div class="section-head">
        <div>
          <p>{{ text('admin.premiumUsers') }}</p>
          <h2>{{ text('admin.activePremiumUsers') }}</h2>
        </div>
        <StatusBadge tone="premium">{{ overview?.premiumUsers.length ?? 0 }}</StatusBadge>
      </div>
      <div v-if="overview?.premiumUsers.length" class="data-list">
        <article v-for="item in overview.premiumUsers" :key="item.userId" class="data-row">
          <div>
            <strong>{{ item.displayName }}</strong>
            <small>@{{ item.username || item.telegramUserId }}</small>
          </div>
          <div class="data-row__meta">
            <StatusBadge tone="premium">{{ item.subscriptionStatus }}</StatusBadge>
            <small>{{ item.currentPeriodEnd ? relativeTime(item.currentPeriodEnd) : '—' }}</small>
          </div>
        </article>
      </div>
      <BaseEmptyState v-else :description="text('admin.noDiagnostics')" :title="text('admin.premiumUsers')" />
    </BaseCard>

    <BaseCard>
      <div class="section-head">
        <div>
          <p>{{ text('admin.quotaUsage') }}</p>
          <h2>{{ text('admin.quotaUsage') }}</h2>
        </div>
      </div>
      <div v-if="overview?.quotaInsights.length" class="quota-grid">
        <article v-for="item in overview.quotaInsights" :key="item.metric" class="quota-card">
          <div>
            <strong>{{ item.metric }}</strong>
            <small>{{ text('admin.totalUsed') }} · {{ item.totalUsed }}</small>
          </div>
          <StatusBadge :tone="item.usersAtRisk ? 'warning' : 'info'">{{ item.usersAtRisk }} {{ text('admin.riskUsers') }}</StatusBadge>
        </article>
      </div>
      <BaseEmptyState v-else :description="text('admin.noDiagnostics')" :title="text('admin.quotaUsage')" />
    </BaseCard>

    <BaseCard>
      <div class="section-head">
        <div>
          <p>{{ text('admin.parserFailures') }}</p>
          <h2>{{ text('admin.parserFailures') }}</h2>
        </div>
        <StatusBadge tone="warning">{{ overview?.recentParserErrors.length ?? 0 }}</StatusBadge>
      </div>
      <div v-if="overview?.recentParserErrors.length" class="data-list">
        <article v-for="item in overview.recentParserErrors" :key="`${item.event}-${item.createdAt}`" class="data-row data-row--stacked">
          <div>
            <strong>{{ item.event }}</strong>
            <small>{{ item.message }}</small>
          </div>
          <small>{{ relativeTime(item.createdAt) }}</small>
        </article>
      </div>
      <BaseEmptyState v-else :description="text('admin.noDiagnostics')" :title="text('admin.parserFailures')" />
    </BaseCard>

    <BaseCard>
      <div class="section-head">
        <div>
          <p>{{ text('admin.reminderFailures') }}</p>
          <h2>{{ text('admin.reminderFailures') }}</h2>
        </div>
        <StatusBadge tone="danger">{{ overview?.recentReminderFailures.length ?? 0 }}</StatusBadge>
      </div>
      <div v-if="overview?.recentReminderFailures.length" class="data-list">
        <article v-for="item in overview.recentReminderFailures" :key="`${item.event}-${item.createdAt}`" class="data-row data-row--stacked">
          <div>
            <strong>{{ item.event }}</strong>
            <small>{{ item.message }}</small>
          </div>
          <small>{{ relativeTime(item.createdAt) }}</small>
        </article>
      </div>
      <BaseEmptyState v-else :description="text('admin.noDiagnostics')" :title="text('admin.reminderFailures')" />
    </BaseCard>

    <BaseCard>
      <div class="section-head">
        <div>
          <p>{{ text('admin.recentActions') }}</p>
          <h2>{{ text('admin.recentActions') }}</h2>
        </div>
        <StatusBadge tone="info">{{ overview?.recentUserActions.length ?? 0 }}</StatusBadge>
      </div>
      <div v-if="overview?.recentUserActions.length" class="data-list">
        <article v-for="item in overview.recentUserActions" :key="`${item.action}-${item.createdAt}-${item.entityId}`" class="data-row data-row--stacked">
          <div>
            <strong>{{ item.action }}</strong>
            <small>{{ item.actorDisplayName }} → {{ item.subjectDisplayName || item.entityType }}</small>
          </div>
          <small>{{ relativeTime(item.createdAt) }}</small>
        </article>
      </div>
      <BaseEmptyState v-else :description="text('admin.noActivity')" :title="text('admin.recentActions')" />
    </BaseCard>

    <BaseEmptyState v-if="!overview && !loading" :description="text('admin.noDiagnostics')" :title="text('admin.title')" />
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
}

.toolbar-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)),
    var(--surface);
  align-items: end;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.toolbar-field {
  display: grid;
  gap: 6px;
}

.toolbar-field span,
.section-head p,
.hint,
.data-row small,
.metric-card span {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.toolbar-field input {
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text);
  min-height: var(--field-height);
  padding: 0 12px;
}

.metric-grid,
.quota-grid,
.grant-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.metric-card,
.quota-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)),
    var(--surface);
  display: grid;
  gap: 6px;
}

.metric-card strong,
.data-row strong,
.quota-card strong {
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
}

.section-head {
  align-items: start;
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-head p {
  letter-spacing: 0.12em;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.section-head h2 {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  margin: 0;
}

.data-list {
  display: grid;
  gap: 10px;
}

.data-row {
  align-items: center;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)), var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding: 12px;
}

.data-row--stacked {
  align-items: start;
}

.data-row__meta {
  display: grid;
  gap: 4px;
  justify-items: end;
}

.hint {
  margin: 8px 0 0;
}

@media (max-width: 560px) {
  .toolbar-card,
  .metric-grid,
  .quota-grid,
  .grant-grid {
    grid-template-columns: 1fr;
  }
}
</style>
