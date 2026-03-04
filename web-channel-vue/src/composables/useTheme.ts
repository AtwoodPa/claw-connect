import { ref, watch, onMounted } from 'vue';
import { useSettingsStore } from '../stores/settings.js';
import type { Theme } from '../stores/settings.js';

export function useTheme() {
  const settings = useSettingsStore();
  const currentTheme = ref<Theme>(settings.theme);
  const isDark = ref(false);

  function applyTheme(theme: Theme) {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      isDark.value = prefersDark;
      root.classList.toggle('dark', prefersDark);
    } else {
      isDark.value = theme === 'dark';
      root.classList.toggle('dark', isDark.value);
    }
  }

  function setTheme(theme: Theme) {
    currentTheme.value = theme;
    settings.setTheme(theme);
    applyTheme(theme);
  }

  onMounted(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      if (currentTheme.value === 'system') applyTheme('system');
    });
    applyTheme(currentTheme.value);
  });

  watch(
    () => settings.theme,
    (t) => {
      currentTheme.value = t;
      applyTheme(t);
    }
  );

  return { theme: currentTheme, isDark, setTheme };
}
