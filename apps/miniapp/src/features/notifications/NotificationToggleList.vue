<template>
  <div class="list">
    <article v-for="item in items" :key="item.label">
      <div>
        <strong>{{ item.label }}</strong>
        <span>{{ item.description }}</span>
      </div>
      <div class="toggle" />
    </article>
  </div>
</template>

<script setup lang="ts">
const items = [
  { label: 'Plan reminders', description: 'Bot alerts before plan deadlines' },
  { label: 'Debt reminders', description: 'Notify on debt due dates' },
  { label: 'Limit alerts', description: 'Warn when spending approaches limits' },
];
</script>

<style scoped>
.list {
  display: grid;
  gap: 12px;
}

article {
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: space-between;
  padding: 14px 16px;
}

strong {
  display: block;
  margin-bottom: 4px;
}

span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.toggle {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-radius: 999px;
  height: 28px;
  position: relative;
  width: 50px;
}

.toggle::after {
  background: #fff;
  border-radius: 999px;
  content: "";
  height: 20px;
  position: absolute;
  right: 4px;
  top: 4px;
  width: 20px;
}
</style>
