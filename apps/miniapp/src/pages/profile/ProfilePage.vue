<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { AppLocale, CategorySnapshot, NotificationSettingsSnapshot, ThemeKey } from '@yordamchi/shared';
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import BaseModal from '../../shared/components/BaseModal.vue';
import { useToast } from '../../composables/useToast';
import { useText } from '../../shared/composables/useText';
import { useSessionStore } from '../../app/stores/session';
import { useUiStore } from '../../app/stores/ui';
import { apiClient } from '../../shared/api/client';
import { resolveTelegramTimeZone } from '../../shared/lib/telegram';
import ThemePicker from '../../features/profile-settings/ThemePicker.vue';
import NotificationToggleList from '../../features/notifications/NotificationToggleList.vue';
import ProfileSummary from '../../widgets/profile-summary/ProfileSummary.vue';
import PremiumUpsell from '../../widgets/premium-upsell/PremiumUpsell.vue';

type ProfileSheet =
  | 'categories'
  | 'edit'
  | 'guide'
  | 'language'
  | 'notifications'
  | 'pin'
  | 'privacy'
  | 'subscription'
  | 'terms';

type NotificationSettingKey =
  | 'botNotificationsEnabled'
  | 'debtRemindersEnabled'
  | 'limitRemindersEnabled'
  | 'planRemindersEnabled'
  | 'subscriptionRemindersEnabled';

const sessionStore = useSessionStore();
const uiStore = useUiStore();
const { text } = useText();
const toast = useToast();
const premiumThemes = new Set<ThemeKey>(['gold', 'mint']);

const activeSheet = ref<ProfileSheet | null>(null);
const categories = ref<CategorySnapshot[]>([]);
const hasLocalPin = ref(false);
const notificationSettings = ref<NotificationSettingsSnapshot | null>(null);
const pinCode = ref('');
const sheetBusy = ref(false);
const sheetError = ref('');

const editForm = reactive({
  baseCurrency: 'UZS' as 'USD' | 'UZS',
  displayName: '',
  timezone: resolveTelegramTimeZone(),
});

const profile = computed(() => sessionStore.profile);
const profileRecord = computed(() => (sessionStore.profile as unknown as Record<string, unknown> | null));
const isPremium = computed(() => Boolean(profile.value?.subscription.isPremium));
const subscriptionEnd = computed(() => {
  const value = profile.value?.subscription.currentPeriodEnd;

  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString(profile.value?.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

const primaryRows = computed(() => [
  {
    action: text('common.edit'),
    icon: 'PR',
    key: 'edit' as const,
    subtitle: profile.value?.phoneNumber ?? text('profile.phone'),
    title: text('profile.editProfile'),
  },
  {
    action: isPremium.value ? text('common.premium') : text('premium.cta'),
    icon: 'PM',
    key: 'subscription' as const,
    subtitle: isPremium.value && subscriptionEnd.value ? subscriptionEnd.value : text('profile.subscriptionExpired'),
    title: text('profile.subscriptionLabel'),
  },
]);

const settingsRows = computed(() => [
  {
    icon: 'NT',
    key: 'notifications' as const,
    subtitle: text('profile.notificationsHint'),
    title: text('common.notifications'),
  },
  {
    icon: 'CT',
    key: 'categories' as const,
    subtitle: text('finance.limits'),
    title: text('profile.categories'),
  },
  {
    icon: 'GD',
    key: 'guide' as const,
    subtitle: text('common.support'),
    title: text('profile.guide'),
  },
  {
    icon: 'LG',
    key: 'language' as const,
    subtitle: String(profile.value?.locale ?? 'uz').toUpperCase(),
    title: text('profile.languageChange'),
  },
  {
    icon: 'SP',
    key: 'support' as const,
    subtitle: 'support@yordamchi.ai',
    title: text('profile.supportCenter'),
  },
  {
    icon: 'TM',
    key: 'terms' as const,
    subtitle: text('profile.terms'),
    title: text('profile.terms'),
  },
  {
    icon: 'PP',
    key: 'privacy' as const,
    subtitle: text('profile.privacy'),
    title: text('profile.privacy'),
  },
]);

const notificationItems = computed(() => {
  const settings = notificationSettings.value;

  return [
    {
      description: text('profile.botNotificationsHint'),
      enabled: settings?.botNotificationsEnabled ?? true,
      id: 'botNotificationsEnabled',
      label: text('profile.botNotifications'),
    },
    {
      description: text('profile.planRemindersHint'),
      enabled: settings?.planRemindersEnabled ?? true,
      id: 'planRemindersEnabled',
      label: text('profile.planReminders'),
    },
    {
      description: text('profile.debtRemindersHint'),
      enabled: settings?.debtRemindersEnabled ?? true,
      id: 'debtRemindersEnabled',
      label: text('profile.debtReminders'),
    },
    {
      description: text('profile.limitAlertsHint'),
      enabled: settings?.limitRemindersEnabled ?? true,
      id: 'limitRemindersEnabled',
      label: text('profile.limitAlerts'),
    },
    {
      description: text('profile.subscriptionAlertsHint'),
      enabled: settings?.subscriptionRemindersEnabled ?? true,
      id: 'subscriptionRemindersEnabled',
      label: text('profile.subscriptionAlerts'),
    },
  ] as Array<{
    description: string;
    enabled: boolean;
    id: NotificationSettingKey;
    label: string;
  }>;
});

const usageRows = computed(() => [
  {
    label: text('profile.planUsage'),
    value: formatUsage('plan_create'),
  },
  {
    label: text('profile.financeUsage'),
    value: formatUsage('finance_entry_create'),
  },
  {
    label: text('profile.debtUsage'),
    value: formatUsage('debt_create'),
  },
]);

const groupedCategories = computed(() => ({
  expense: categories.value.filter((item) => item.kind === 'expense'),
  general: categories.value.filter((item) => item.kind === 'general'),
  income: categories.value.filter((item) => item.kind === 'income'),
}));

onMounted(() => {
  hasLocalPin.value = Boolean(window.localStorage.getItem('yordamchi-local-pin'));
  syncEditForm();
});

function syncEditForm() {
  editForm.baseCurrency = profile.value?.baseCurrency ?? 'UZS';
  editForm.displayName = profile.value?.displayName ?? '';
  editForm.timezone = profile.value?.timezone ?? resolveTelegramTimeZone();
}

function formatUsage(metric: 'debt_create' | 'finance_entry_create' | 'plan_create') {
  const current = profile.value?.usage.find((item) => item.metric === metric);

  if (!current) {
    return '0';
  }

  return current.limit === null ? `${current.used}` : `${current.used} / ${current.limit}`;
}

function resolveCategoryName(category: CategorySnapshot) {
  const key = `categories.${category.slug}`;
  const localized = text(key);
  return localized === key ? category.name : localized;
}

async function openSheet(sheet: ProfileSheet) {
  activeSheet.value = sheet;
  sheetError.value = '';

  if (sheet === 'edit') {
    syncEditForm();
  }

  if (sheet === 'notifications' && !notificationSettings.value) {
    await loadNotificationSettings();
  }

  if (sheet === 'categories' && !categories.value.length) {
    await loadCategories();
  }

  if (sheet === 'pin') {
    pinCode.value = '';
  }
}

async function loadNotificationSettings() {
  try {
    sheetBusy.value = true;
    sheetError.value = '';
    const response = await apiClient.get<{ settings: NotificationSettingsSnapshot }>('/api/v1/profile/notifications');
    notificationSettings.value = response.settings;
  } catch (error) {
    sheetError.value = error instanceof Error ? error.message : text('errors.generic');
    toast.show({
      message: sheetError.value,
      variant: 'error',
    });
  } finally {
    sheetBusy.value = false;
  }
}

async function loadCategories() {
  try {
    sheetBusy.value = true;
    sheetError.value = '';
    const response = await apiClient.get<{ categories: CategorySnapshot[] }>('/api/v1/categories');
    categories.value = response.categories ?? [];
  } catch (error) {
    sheetError.value = error instanceof Error ? error.message : text('errors.generic');
    toast.show({
      message: sheetError.value,
      variant: 'error',
    });
  } finally {
    sheetBusy.value = false;
  }
}

async function saveProfileDetails() {
  try {
    sheetBusy.value = true;
    sheetError.value = '';
    await apiClient.patch('/api/v1/profile', {
      baseCurrency: editForm.baseCurrency,
      displayName: editForm.displayName.trim() || undefined,
      timezone: editForm.timezone.trim() || undefined,
    });

    sessionStore.setProfilePatch({
      baseCurrency: editForm.baseCurrency,
      displayName: editForm.displayName.trim() || (profile.value?.displayName ?? ''),
      timezone: editForm.timezone.trim() || (profile.value?.timezone ?? resolveTelegramTimeZone()),
    });
    toast.show({
      message: text('common.saved'),
      variant: 'success',
    });
    activeSheet.value = null;
  } catch (error) {
    sheetError.value = error instanceof Error ? error.message : text('errors.generic');
    toast.show({
      message: sheetError.value,
      variant: 'error',
    });
  } finally {
    sheetBusy.value = false;
  }
}

async function updateTheme(theme: ThemeKey) {
  if (premiumThemes.has(theme) && !isPremium.value) {
    activeSheet.value = 'subscription';
    return;
  }

  try {
    uiStore.applyTheme(theme);
    await apiClient.patch('/api/v1/profile', { themePreference: theme });
    sessionStore.setProfilePatch({ themePreference: theme });
  } catch {
    uiStore.applyTheme(profile.value?.themePreference ?? 'blue');
    toast.show({
      message: text('errors.generic'),
      variant: 'error',
    });
  }
}

async function updateLocale(locale: AppLocale) {
  try {
    uiStore.setLocale(locale);
    await apiClient.patch('/api/v1/profile', { locale });
    sessionStore.setProfilePatch({ locale });
  } catch {
    uiStore.setLocale(profile.value?.locale ?? 'uz');
    toast.show({
      message: text('errors.generic'),
      variant: 'error',
    });
  }
}

async function toggleNotification(id: string) {
  if (!notificationSettings.value) {
    return;
  }

  const settingKey = id as NotificationSettingKey;

  const nextValue = !notificationSettings.value[settingKey];
  const previous = notificationSettings.value;

  notificationSettings.value = {
    ...previous,
    [settingKey]: nextValue,
  };

  try {
    const response = await apiClient.patch<{ settings: NotificationSettingsSnapshot }>('/api/v1/profile/notifications', {
      [settingKey]: nextValue,
    });
    notificationSettings.value = response.settings;
  } catch (error) {
    notificationSettings.value = previous;
    sheetError.value = error instanceof Error ? error.message : text('errors.generic');
    toast.show({
      message: sheetError.value,
      variant: 'error',
    });
  }
}

function openSupport() {
  window.location.href = 'mailto:support@yordamchi.ai?subject=Yordamchi%20AI%20Support';
}

function downloadExport() {
  const payload = {
    dashboard: sessionStore.dashboard,
    exportedAt: new Date().toISOString(),
    notifications: notificationSettings.value,
    profile: sessionStore.profile,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `yordamchi-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast.show({
    message: text('common.exportStarted'),
    variant: 'info',
  });
}

function savePin() {
  const normalized = pinCode.value.trim();

  if (!/^\d{4}$/.test(normalized)) {
    sheetError.value = text('profile.pinHint');
    return;
  }

  window.localStorage.setItem('yordamchi-local-pin', normalized);
  hasLocalPin.value = true;
  pinCode.value = '';
  toast.show({
    message: text('common.saved'),
    variant: 'success',
  });
  activeSheet.value = null;
}

function clearPin() {
  window.localStorage.removeItem('yordamchi-local-pin');
  hasLocalPin.value = false;
  pinCode.value = '';
  toast.show({
    message: text('common.saved'),
    variant: 'success',
  });
  activeSheet.value = null;
}

async function quickThemeSwitch() {
  if (uiStore.theme === 'blue' && isPremium.value) {
    await updateTheme('gold');
    return;
  }

  if (uiStore.theme === 'gold') {
    await updateTheme('mint');
    return;
  }

  await updateTheme(uiStore.theme === 'graphite' ? 'blue' : 'graphite');
}

function handlePrimaryAction(key: ProfileSheet) {
  void openSheet(key);
}

function handleRowAction(key: ProfileSheet | 'support') {
  if (key === 'support') {
    openSupport();
    return;
  }

  void openSheet(key);
}
</script>

<template>
  <div class="page">
    <ProfileSummary :profile="profileRecord" />

    <BaseCard class="group-card">
      <article
        v-for="row in primaryRows"
        :key="row.title"
        class="group-row group-row--clickable"
        role="button"
        tabindex="0"
        @click="handlePrimaryAction(row.key)"
        @keydown.enter.prevent="handlePrimaryAction(row.key)"
      >
        <div class="group-row__lead">
          <span class="group-row__icon">{{ row.icon }}</span>
          <div>
            <strong>{{ row.title }}</strong>
            <small>{{ row.subtitle }}</small>
          </div>
        </div>

        <button class="group-row__pill" type="button" @click.stop="handlePrimaryAction(row.key)">{{ row.action }}</button>
      </article>
    </BaseCard>

    <BaseCard class="group-card">
      <article
        v-for="row in settingsRows.slice(0, 4)"
        :key="row.title"
        class="group-row group-row--clickable"
        role="button"
        tabindex="0"
        @click="handleRowAction(row.key)"
        @keydown.enter.prevent="handleRowAction(row.key)"
      >
        <div class="group-row__lead">
          <span class="group-row__icon">{{ row.icon }}</span>
          <div>
            <strong>{{ row.title }}</strong>
            <small>{{ row.subtitle }}</small>
          </div>
        </div>
        <span class="group-row__chevron">›</span>
      </article>
    </BaseCard>

    <BaseCard class="group-card">
      <article
        class="group-row group-row--clickable"
        role="button"
        tabindex="0"
        @click="openSheet('pin')"
        @keydown.enter.prevent="openSheet('pin')"
      >
        <div class="group-row__lead">
          <span class="group-row__icon">PN</span>
          <div>
            <strong>{{ text('profile.pinCode') }}</strong>
            <small>{{ hasLocalPin ? text('profile.pinSet') : text('profile.pinNotSet') }}</small>
          </div>
        </div>
        <button class="group-row__pill" type="button" @click.stop="openSheet('pin')">
          {{ hasLocalPin ? text('profile.removePin') : text('profile.setPin') }}
        </button>
      </article>

      <article class="group-row">
        <div class="group-row__lead">
          <span class="group-row__icon">TH</span>
          <div>
            <strong>{{ text('profile.themeMode') }}</strong>
            <small>{{ text('profile.themeHint') }}</small>
          </div>
        </div>
        <button class="group-row__pill" type="button" @click.stop="quickThemeSwitch">{{ text('common.switch') }}</button>
      </article>

      <div class="locale-card">
        <div class="locale-card__head">
          <strong>{{ text('profile.languageChange') }}</strong>
          <small>{{ text('profile.languageHint') }}</small>
        </div>
        <div class="locale-card__grid">
          <BaseButton :variant="profile?.locale === 'uz' ? 'primary' : 'secondary'" @click="updateLocale('uz')">UZ</BaseButton>
          <BaseButton :variant="profile?.locale === 'en' ? 'primary' : 'secondary'" @click="updateLocale('en')">EN</BaseButton>
          <BaseButton :variant="profile?.locale === 'ru' ? 'primary' : 'secondary'" @click="updateLocale('ru')">RU</BaseButton>
        </div>
      </div>
    </BaseCard>

    <ThemePicker :is-premium="isPremium" :theme="uiStore.theme" @select="updateTheme" @upgrade="openSheet('subscription')" />

    <BaseCard class="group-card">
      <article
        v-for="row in settingsRows.slice(4)"
        :key="row.title"
        class="group-row group-row--clickable"
        role="button"
        tabindex="0"
        @click="handleRowAction(row.key)"
        @keydown.enter.prevent="handleRowAction(row.key)"
      >
        <div class="group-row__lead">
          <span class="group-row__icon">{{ row.icon }}</span>
          <div>
            <strong>{{ row.title }}</strong>
            <small>{{ row.subtitle }}</small>
          </div>
        </div>
        <span class="group-row__chevron">›</span>
      </article>
    </BaseCard>

    <BaseCard class="group-card">
      <article
        class="group-row group-row--clickable"
        role="button"
        tabindex="0"
        @click="downloadExport"
        @keydown.enter.prevent="downloadExport"
      >
        <div class="group-row__lead">
          <span class="group-row__icon">EX</span>
          <div>
            <strong>{{ text('profile.jsonExport') }}</strong>
            <small>{{ text('profile.export') }}</small>
          </div>
        </div>
        <span class="group-row__chevron">›</span>
      </article>
    </BaseCard>

    <PremiumUpsell v-if="!isPremium" @cta="openSheet('subscription')" />

    <BaseModal :open="activeSheet === 'edit'" :title="text('profile.editProfile')" @close="activeSheet = null">
      <label class="sheet-field">
        <span>{{ text('profile.displayNameLabel') }}</span>
        <input v-model="editForm.displayName" />
      </label>

      <label class="sheet-field">
        <span>{{ text('profile.baseCurrencyLabel') }}</span>
        <select v-model="editForm.baseCurrency">
          <option value="UZS">UZS</option>
          <option value="USD">USD</option>
        </select>
      </label>

      <label class="sheet-field">
        <span>{{ text('profile.timezone') }}</span>
        <input v-model="editForm.timezone" />
      </label>

      <p v-if="sheetError" class="sheet-error">{{ sheetError }}</p>

      <template #footer>
        <BaseButton variant="secondary" @click="activeSheet = null">{{ text('common.close') }}</BaseButton>
        <BaseButton :block="false" @click="saveProfileDetails">{{ sheetBusy ? text('common.loading') : text('profile.saveChanges') }}</BaseButton>
      </template>
    </BaseModal>

    <BaseModal :open="activeSheet === 'subscription'" :title="text('profile.subscriptionLabel')" @close="activeSheet = null">
      <div class="sheet-copy">
        <strong>{{ isPremium ? text('common.premium') : text('common.free') }}</strong>
        <small>{{ isPremium && subscriptionEnd ? subscriptionEnd : text('profile.subscriptionExpired') }}</small>
      </div>

      <div class="usage-list">
        <article v-for="item in usageRows" :key="item.label" class="usage-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>

      <p v-if="!isPremium" class="sheet-note">{{ text('premium.lockedBody') }}</p>

      <template #footer>
        <BaseButton variant="secondary" @click="activeSheet = null">{{ text('common.close') }}</BaseButton>
        <BaseButton v-if="!isPremium" @click="openSupport">{{ text('premium.cta') }}</BaseButton>
      </template>
    </BaseModal>

    <BaseModal :open="activeSheet === 'notifications'" :title="text('common.notifications')" @close="activeSheet = null">
      <NotificationToggleList :items="notificationItems" @toggle="toggleNotification" />
      <p v-if="sheetError" class="sheet-error">{{ sheetError }}</p>
    </BaseModal>

    <BaseModal :open="activeSheet === 'categories'" :title="text('profile.categories')" @close="activeSheet = null">
      <div v-if="sheetBusy" class="sheet-note">{{ text('common.loading') }}</div>
      <template v-else>
        <div v-if="groupedCategories.expense.length" class="category-block">
          <p>{{ text('finance.expense') }}</p>
          <div class="category-chips">
            <span v-for="category in groupedCategories.expense" :key="category.id" class="category-chip">
              {{ category.icon || '•' }} {{ resolveCategoryName(category) }}
            </span>
          </div>
        </div>

        <div v-if="groupedCategories.income.length" class="category-block">
          <p>{{ text('finance.income') }}</p>
          <div class="category-chips">
            <span v-for="category in groupedCategories.income" :key="category.id" class="category-chip">
              {{ category.icon || '•' }} {{ resolveCategoryName(category) }}
            </span>
          </div>
        </div>

        <div v-if="groupedCategories.general.length" class="category-block">
          <p>{{ text('categories.general') }}</p>
          <div class="category-chips">
            <span v-for="category in groupedCategories.general" :key="category.id" class="category-chip">
              {{ category.icon || '•' }} {{ resolveCategoryName(category) }}
            </span>
          </div>
        </div>

        <p v-if="!categories.length" class="sheet-note">{{ text('profile.categoriesEmpty') }}</p>
        <p v-if="sheetError" class="sheet-error">{{ sheetError }}</p>
      </template>
    </BaseModal>

    <BaseModal :open="activeSheet === 'guide'" :title="text('profile.guide')" @close="activeSheet = null">
      <ul class="sheet-bullets">
        <li>{{ text('profile.guideStepOne') }}</li>
        <li>{{ text('profile.guideStepTwo') }}</li>
        <li>{{ text('profile.guideStepThree') }}</li>
      </ul>
    </BaseModal>

    <BaseModal :open="activeSheet === 'language'" :title="text('profile.languageChange')" @close="activeSheet = null">
      <p class="sheet-note">{{ text('profile.languageHint') }}</p>
      <div class="locale-card__grid">
        <BaseButton :variant="profile?.locale === 'uz' ? 'primary' : 'secondary'" @click="updateLocale('uz')">UZ</BaseButton>
        <BaseButton :variant="profile?.locale === 'en' ? 'primary' : 'secondary'" @click="updateLocale('en')">EN</BaseButton>
        <BaseButton :variant="profile?.locale === 'ru' ? 'primary' : 'secondary'" @click="updateLocale('ru')">RU</BaseButton>
      </div>
    </BaseModal>

    <BaseModal :open="activeSheet === 'terms'" :title="text('profile.terms')" @close="activeSheet = null">
      <p class="sheet-note">{{ text('profile.termsBody') }}</p>
    </BaseModal>

    <BaseModal :open="activeSheet === 'privacy'" :title="text('profile.privacy')" @close="activeSheet = null">
      <p class="sheet-note">{{ text('profile.privacyBody') }}</p>
    </BaseModal>

    <BaseModal :open="activeSheet === 'pin'" :title="text('profile.pinCode')" @close="activeSheet = null">
      <p class="sheet-note">{{ text('profile.pinHint') }}</p>
      <label class="sheet-field">
        <span>{{ text('profile.pinCode') }}</span>
        <input v-model="pinCode" :placeholder="text('profile.pinPlaceholder')" inputmode="numeric" maxlength="4" />
      </label>
      <p v-if="sheetError" class="sheet-error">{{ sheetError }}</p>

      <template #footer>
        <BaseButton v-if="hasLocalPin" variant="secondary" @click="clearPin">{{ text('profile.removePin') }}</BaseButton>
        <BaseButton @click="savePin">{{ text('profile.setPin') }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.page {
  gap: 14px;
}

.group-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)),
    var(--surface);
  display: grid;
  overflow: hidden;
  padding: 0;
}

.group-row {
  align-items: center;
  border-top: 1px solid var(--divider);
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-height: 56px;
  padding: 12px 14px;
}

.group-row:first-child {
  border-top: none;
}

.group-row--clickable {
  cursor: pointer;
}

.group-row__lead {
  align-items: center;
  display: flex;
  flex: 1;
  gap: 12px;
  min-width: 0;
}

.group-row__lead > div {
  flex: 1;
  min-width: 0;
}

.group-row__icon {
  align-items: center;
  background: color-mix(in srgb, var(--surface-soft) 88%, var(--bg) 12%);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  color: var(--accent);
  display: inline-flex;
  font-size: 10px;
  font-weight: var(--weight-semibold);
  justify-content: center;
  letter-spacing: 0.08em;
  min-width: 32px;
  width: 32px;
  height: 32px;
}

.group-row__lead strong {
  display: block;
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
  line-height: 1.2;
  margin-bottom: 2px;
}

.group-row__lead small {
  color: var(--text-muted);
  display: block;
  font-size: var(--text-xs);
  line-height: 1.35;
}

.group-row__chevron {
  color: var(--text-muted);
  font-size: 18px;
  line-height: 1;
}

.group-row__pill {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
  border-radius: 12px;
  color: var(--accent-strong);
  cursor: pointer;
  display: inline-flex;
  font-size: var(--text-xs);
  font-weight: var(--weight-interactive);
  justify-content: center;
  line-height: 1.2;
  max-width: 170px;
  min-height: 34px;
  padding: 0 12px;
  text-align: center;
  white-space: normal;
}

.locale-card {
  border-top: 1px solid var(--divider);
  display: grid;
  gap: 10px;
  padding: 12px 14px 14px;
}

.locale-card__head strong {
  display: block;
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
  margin-bottom: 2px;
}

.locale-card__head small {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.locale-card__grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.locale-card :deep(.button) {
  min-height: 38px;
  padding-inline: 12px;
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

.sheet-field input,
.sheet-field select {
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text);
  min-height: var(--field-height);
  padding: 0 14px;
}

.sheet-copy {
  display: grid;
  gap: 4px;
}

.sheet-copy strong {
  font-size: var(--text-lg);
  font-weight: var(--weight-interactive);
}

.sheet-copy small,
.sheet-note {
  color: var(--text-muted);
  font-size: var(--text-body);
  line-height: 1.5;
  margin: 0;
}

.sheet-error {
  color: var(--danger);
  font-size: var(--text-xs);
  margin: 0;
}

.usage-list {
  display: grid;
  gap: 8px;
}

.usage-item {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
}

.usage-item span {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.usage-item strong {
  font-size: var(--text-body);
  font-weight: var(--weight-interactive);
}

.category-block {
  display: grid;
  gap: 8px;
}

.category-block p {
  color: var(--text-muted);
  font-size: var(--text-section);
  font-weight: var(--weight-interactive);
  letter-spacing: 0.12em;
  margin: 0;
  text-transform: uppercase;
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-chip {
  background: var(--surface-soft);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  font-size: var(--text-xs);
  padding: 6px 10px;
}

.sheet-bullets {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 18px;
}

.sheet-bullets li {
  color: var(--text);
  font-size: var(--text-body);
  line-height: 1.45;
}
</style>
