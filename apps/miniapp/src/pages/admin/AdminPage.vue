<script setup lang="ts">
import type { AdminOverview } from '@yordamchi/shared';
import { computed, onMounted, reactive, ref } from 'vue';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseEmptyState from '../../shared/components/BaseEmptyState.vue';
import LoadingBlock from '../../shared/components/LoadingBlock.vue';
import StatusBadge from '../../shared/components/StatusBadge.vue';
import { useToast } from '../../composables/useToast';
import { apiClient } from '../../shared/api/client';
import { useText } from '../../shared/composables/useText';

const { text } = useText();
const toast = useToast();
const overview = ref<AdminOverview | null>(null);
const grantBusy = ref(false);
const initialLoading = computed(() => loading.value && !overview.value);
const lastLoadedAt = ref<string | null>(null);
const loading = ref(false);
const searchQuery = ref('');
const hasSearch = computed(() => searchQuery.value.trim().length > 0);
const form = reactive({
  months: 1,
  telegramUserId: '',
});
const canGrant = computed(() => {
  const telegramUserId = Number(form.telegramUserId.trim());

  return !grantBusy.value
    && Number.isInteger(telegramUserId)
    && telegramUserId > 0
    && Number.isInteger(form.months)
    && form.months >= 1
    && form.months <= 24;
});

async function loadOverview() {
  try {
    loading.value = true;
    const query = searchQuery.value.trim();
    const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
    overview.value = await apiClient.get<AdminOverview>(`/api/v1/admin/overview${suffix}`);
    lastLoadedAt.value = new Date().toISOString();
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
  normalizeTelegramUserId();
  const telegramUserId = Number(form.telegramUserId.trim());
  const months = Math.min(24, Math.max(1, Math.trunc(form.months || 0)));

  if (!Number.isInteger(telegramUserId) || telegramUserId <= 0 || !Number.isInteger(months) || months < 1) {
    toast.show({
      message: text('errors.validation'),
      variant: 'error',
    });
    return;
  }

  try {
    grantBusy.value = true;
    await apiClient.post('/api/v1/admin/subscriptions/grant', {
      months,
      targetTelegramUserId: telegramUserId,
    });
    toast.show({
      message: text('admin.premiumGranted'),
      variant: 'success',
    });
    form.months = 1;
    form.telegramUserId = '';
    await loadOverview();
  } catch (error) {
    toast.show({
      message: error instanceof Error ? error.message : text('errors.generic'),
      variant: 'error',
    });
  } finally {
    grantBusy.value = false;
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

function normalizeTelegramUserId() {
  form.telegramUserId = form.telegramUserId.replace(/\D+/g, '');
}

function resetSearch() {
  searchQuery.value = '';
  void loadOverview();
}

function resolveLogTone(level: 'audit' | 'error' | 'info' | 'warn') {
  if (level === 'error') {
    return 'danger';
  }

  if (level === 'warn') {
    return 'warning';
  }

  return 'info';
}

onMounted(() => {
  void loadOverview();
});
</script>

<template>
  <div class="page">
    <header class="page__header page__header--stacked">
      <div>
        <p>{{ text('admin.diagnostics') }}</p>
        <h1>{{ text('admin.title') }}</h1>
        <small v-if="lastLoadedAt" class="page__timestamp">{{ relativeTime(lastLoadedAt) }}</small>
      </div>
      <div class="page__actions">
        <BaseButton v-if="hasSearch" :block="false" variant="ghost" :disabled="loading" @click="resetSearch">
          {{ text('common.all') }}
        </BaseButton>
        <BaseButton :block="false" variant="secondary" :disabled="loading" @click="loadOverview">
          {{ loading ? text('common.loading') : text('common.retry') }}
        </BaseButton>
      </div>
    </header>

    <BaseCard class="toolbar-card">
      <label class="toolbar-field toolbar-field--wide">
        <span>{{ text('admin.searchPlaceholder') }}</span>
        <input
          v-model="searchQuery"
          :placeholder="text('admin.searchPlaceholder')"
          @input="searchQuery = searchQuery.trimStart()"
          @keyup.enter="loadOverview"
        />
      </label>
      <div class="toolbar-actions">
        <BaseButton :block="false" :disabled="loading" @click="loadOverview">{{ text('admin.searchAction') }}</BaseButton>
        <BaseButton v-if="hasSearch" :block="false" variant="ghost" :disabled="loading" @click="resetSearch">
          {{ text('common.all') }}
        </BaseButton>
      </div>
    </BaseCard>

    <div v-if="initialLoading" class="loading-grid">
      <LoadingBlock v-for="item in 4" :key="item" />
    </div>

    <template v-else-if="overview">
      <div class="metric-grid">
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

      <BaseCard class="grant-card">
      <div class="section-head">
        <div>
          <p>{{ text('admin.grantPremium') }}</p>
          <h2>{{ text('common.premium') }}</h2>
        </div>
      </div>
      <div class="grant-grid">
        <label class="toolbar-field">
          <span>{{ text('admin.userIdLabel') }}</span>
          <input v-model="form.telegramUserId" inputmode="numeric" placeholder="7894854944" @input="normalizeTelegramUserId" />
        </label>
        <label class="toolbar-field">
          <span>{{ text('admin.monthsLabel') }}</span>
          <input v-model.number="form.months" inputmode="numeric" max="24" min="1" step="1" type="number" />
        </label>
      </div>
      <BaseButton block :disabled="!canGrant" @click="grantPremium">
        {{ grantBusy ? text('common.loading') : text('admin.grantPremium') }}
      </BaseButton>
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
          <div class="data-row__lead data-row__lead--stacked">
            <strong>{{ item.displayName }}</strong>
            <small>{{ item.username ? `@${item.username} · Telegram ${item.telegramUserId}` : `Telegram ${item.telegramUserId}` }}</small>
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
          <div class="data-row__lead data-row__lead--stacked">
            <strong>{{ item.metric }}</strong>
            <small>{{ text('admin.totalUsed') }} · {{ item.totalUsed }}</small>
          </div>
          <div class="data-row__badges">
            <StatusBadge tone="info">{{ item.limit ?? '∞' }}</StatusBadge>
            <StatusBadge :tone="item.usersAtRisk ? 'warning' : 'success'">{{ item.usersAtRisk }} {{ text('admin.riskUsers') }}</StatusBadge>
          </div>
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
        <article v-for="item in overview.recentParserErrors" :key="`${item.event}-${item.createdAt}`" class="data-row">
          <div class="data-row__lead data-row__lead--stacked">
            <strong>{{ item.event }}</strong>
            <small>{{ item.message }}</small>
          </div>
          <div class="data-row__meta">
            <StatusBadge :tone="resolveLogTone(item.level)">{{ item.level }}</StatusBadge>
            <small>{{ relativeTime(item.createdAt) }}</small>
          </div>
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
        <article v-for="item in overview.recentReminderFailures" :key="`${item.event}-${item.createdAt}`" class="data-row">
          <div class="data-row__lead data-row__lead--stacked">
            <strong>{{ item.event }}</strong>
            <small>{{ item.message }}</small>
          </div>
          <div class="data-row__meta">
            <StatusBadge :tone="resolveLogTone(item.level)">{{ item.level }}</StatusBadge>
            <small>{{ relativeTime(item.createdAt) }}</small>
          </div>
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
        <article v-for="item in overview.recentUserActions" :key="`${item.action}-${item.createdAt}-${item.entityId}`" class="data-row">
          <div class="data-row__lead data-row__lead--stacked">
            <strong>{{ item.action }}</strong>
            <small>{{ item.actorDisplayName }} → {{ item.subjectDisplayName || item.entityType }}</small>
            <small class="data-row__aux">
              {{ item.entityType }}<template v-if="item.actorTelegramUserId"> · {{ item.actorTelegramUserId }}</template>
            </small>
          </div>
          <div class="data-row__meta">
            <StatusBadge :tone="resolveLogTone(item.level)">{{ item.level }}</StatusBadge>
            <small>{{ relativeTime(item.createdAt) }}</small>
          </div>
        </article>
      </div>
      <BaseEmptyState v-else :description="text('admin.noActivity')" :title="text('admin.recentActions')" />
      </BaseCard>
    </template>

    <BaseEmptyState v-else :description="text('admin.noDiagnostics')" :title="text('admin.title')" />
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
}

.page__header--stacked {
  align-items: flex-start;
  flex-wrap: wrap;
}

.page__timestamp {
  color: var(--text-muted);
  display: block;
  font-size: var(--text-xs);
  margin-top: 6px;
}

.page__actions,
.toolbar-actions,
.data-row__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

.toolbar-field--wide {
  min-width: 0;
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

.loading-grid,
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

.grant-card {
  display: grid;
  gap: 12px;
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
  align-items: flex-start;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)), var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding: 12px;
}

.data-row__lead {
  min-width: 0;
}

.data-row__lead--stacked {
  display: grid;
  gap: 4px;
}

.data-row__aux {
  color: var(--text-soft);
}

.data-row__meta {
  display: grid;
  gap: 6px;
  justify-items: end;
  text-align: right;
}

.hint {
  margin: 8px 0 0;
}

@media (max-width: 560px) {
  .toolbar-card,
  .loading-grid,
  .metric-grid,
  .quota-grid,
  .grant-grid {
    grid-template-columns: 1fr;
  }

  .data-row {
    flex-direction: column;
  }

  .data-row__meta {
    justify-items: start;
    text-align: left;
  }
}
</style>
