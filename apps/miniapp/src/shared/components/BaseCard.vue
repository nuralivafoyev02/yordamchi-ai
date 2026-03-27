<template>
  <section class="card">
    <slot />
  </section>
</template>

<style scoped>
.card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)),
    var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  padding: 14px;
  position: relative;
}
</style>
