<template>
  <div class="loading-block" />
</template>

<style scoped>
.loading-block {
  animation: pulse 1.3s infinite ease-in-out;
  background: linear-gradient(135deg, rgba(31, 114, 255, 0.12), rgba(31, 114, 255, 0.05));
  border-radius: var(--radius-md);
  height: 88px;
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
