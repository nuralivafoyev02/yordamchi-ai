import { computed, readonly, ref } from 'vue';

export type ToastVariant = 'error' | 'info' | 'success' | 'warning';

interface ToastInput {
  duration?: number;
  message: string;
  title?: string;
  variant?: ToastVariant;
}

interface ToastItem extends Required<Pick<ToastInput, 'duration' | 'message' | 'variant'>> {
  id: number;
  title?: string;
}

const currentToast = ref<ToastItem | null>(null);
const queue = ref<ToastItem[]>([]);
const closing = ref(false);

let counter = 0;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function clearDismissTimer() {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

function flushQueue() {
  if (currentToast.value || !queue.value.length) {
    return;
  }

  closing.value = false;
  currentToast.value = queue.value.shift() ?? null;

  if (!currentToast.value) {
    return;
  }

  clearDismissTimer();
  dismissTimer = setTimeout(() => {
    dismiss();
  }, currentToast.value.duration);
}

function dismiss() {
  if (!currentToast.value) {
    return;
  }

  clearDismissTimer();
  closing.value = true;

  setTimeout(() => {
    currentToast.value = null;
    closing.value = false;
    flushQueue();
  }, 180);
}

function pushToast(input: ToastInput) {
  queue.value.push({
    duration: input.duration ?? 3000,
    id: ++counter,
    message: input.message,
    title: input.title,
    variant: input.variant ?? 'info',
  });

  flushQueue();
}

export function useToast() {
  return {
    current: readonly(currentToast),
    dismiss,
    isClosing: readonly(closing),
    show: pushToast,
    visible: computed(() => Boolean(currentToast.value)),
  };
}
