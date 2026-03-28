<template>
  <section class="card">
    <slot />
  </section>
</template>

<style scoped>
.card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0) 22%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 82%, transparent), transparent 75%),
    var(--surface);
  border: 1px solid color-mix(in srgb, var(--border-strong) 88%, rgba(255, 255, 255, 0.03));
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  isolation: isolate;
  overflow: hidden;
  padding: 16px;
  position: relative;
}

.card::before {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  content: '';
  height: 1px;
  left: 18px;
  opacity: 0.8;
  position: absolute;
  right: 18px;
  top: 0;
}
</style>
