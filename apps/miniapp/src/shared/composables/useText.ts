import { computed } from 'vue';
import { useUiStore } from '../../app/stores/ui';

export function useText() {
  const uiStore = useUiStore();

  return {
    locale: computed(() => uiStore.locale),
    text: (key: string, params?: Record<string, string | number>) => uiStore.text(key, params),
  };
}
