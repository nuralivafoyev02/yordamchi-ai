<template>
  <div class="loading-block" />
</template>

<style scoped>
.loading-block {
  animation: pulse 1.3s infinite ease-in-out;
  background: linear-gradient(90deg, #252529, #2d2d31, #252529);
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
