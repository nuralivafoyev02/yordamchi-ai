<template>
  <div class="loading-block" />
</template>

<style scoped>
.loading-block {
  animation: pulse 1.3s infinite ease-in-out;
  background: linear-gradient(90deg, var(--surface), var(--surface-soft), var(--surface));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  height: 72px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }
}
</style>
