<script setup lang="ts">
import BaseButton from '../../shared/components/BaseButton.vue';
import BaseCard from '../../shared/components/BaseCard.vue';
import { useText } from '../../shared/composables/useText';
import { closeTelegramWebApp } from '../../shared/lib/telegram';

defineEmits<{
  retry: [];
}>();

const { text } = useText();

function closeMiniApp() {
  closeTelegramWebApp();
}
</script>

<template>
  <BaseCard class="gate-card">
    <div class="gate-card__glow gate-card__glow--gold" />
    <div class="gate-card__glow gate-card__glow--teal" />

    <div class="gate-card__content">
      <span class="gate-card__eyebrow">{{ text('common.locked') }}</span>
      <h1>{{ text('bot.phoneGateTitle') }}</h1>
      <p class="gate-card__description">{{ text('bot.phoneRequired') }}</p>
      <p class="gate-card__hint">{{ text('bot.phoneGateHint') }}</p>

      <ol class="gate-card__steps">
        <li>{{ text('bot.phoneGateStepOne') }}</li>
        <li>{{ text('bot.phoneGateStepTwo') }}</li>
      </ol>

      <div class="gate-card__actions">
        <BaseButton block @click="$emit('retry')">{{ text('common.retry') }}</BaseButton>
        <BaseButton block variant="secondary" @click="closeMiniApp">{{ text('common.closeMiniApp') }}</BaseButton>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.gate-card {
  min-height: calc(100vh - 32px);
  overflow: hidden;
  position: relative;
}

.gate-card__glow {
  border-radius: 999px;
  filter: blur(64px);
  opacity: 0.24;
  position: absolute;
}

.gate-card__glow--gold {
  background: color-mix(in srgb, var(--accent) 42%, transparent);
  height: 220px;
  left: -80px;
  top: 36px;
  width: 220px;
}

.gate-card__glow--teal {
  background: color-mix(in srgb, var(--success) 28%, transparent);
  bottom: 70px;
  height: 220px;
  right: -100px;
  width: 220px;
}

.gate-card__content {
  display: grid;
  gap: 12px;
  padding: 20px 16px;
  position: relative;
  z-index: 1;
}

.gate-card__eyebrow {
  color: var(--accent-strong);
  font-size: var(--text-section);
  font-weight: var(--weight-interactive);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.gate-card__content h1 {
  font-size: clamp(20px, 6vw, 26px);
  font-weight: var(--weight-title);
  line-height: 1.1;
  margin: 0;
  max-width: 15ch;
}

.gate-card__description,
.gate-card__hint {
  color: var(--tg-hint);
  font-size: var(--text-body);
  line-height: 1.45;
  margin: 0;
  max-width: 34ch;
}

.gate-card__steps {
  display: grid;
  gap: 12px;
  margin: 4px 0 0;
  padding: 0;
}

.gate-card__steps li {
  align-items: flex-start;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: grid;
  gap: 8px;
  grid-template-columns: 28px minmax(0, 1fr);
  list-style: none;
  padding: 10px 12px;
}

.gate-card__steps li::before {
  align-items: center;
  background: var(--accent-soft);
  border-radius: 999px;
  color: var(--accent-strong);
  content: counter(list-item);
  display: inline-flex;
  font-size: var(--text-sm);
  font-weight: 700;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.gate-card__actions {
  display: grid;
  gap: 10px;
  margin-top: 4px;
}
</style>
