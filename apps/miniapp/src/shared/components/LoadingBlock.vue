<template>
  <div class="loading-block" />
</template>

<style scoped>
.loading-block {
  animation: pulse 1.3s infinite ease-in-out;
  background: linear-gradient(90deg, var(--surface), var(--surface-strong), var(--surface));
  border-radius: var(--radius-md);
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
