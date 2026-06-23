import { ref, computed, watch } from 'vue';
import md3Light from '@varlet/ui/es/themes/md3-light/index.mjs';
import md3Dark from '@varlet/ui/es/themes/md3-dark/index.mjs';

const STORAGE_KEY = 'teyvat-railways-theme';

function loadTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | null;
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

const theme = ref<'light' | 'dark'>(loadTheme());

watch(theme, (val) => {
  try {
    localStorage.setItem(STORAGE_KEY, val);
  } catch {}
});

export function useTheme() {
  const styleVars = computed(
    () => (theme.value === 'dark' ? md3Dark : md3Light) as Record<string, string>,
  );

  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  }

  return { theme, styleVars, toggle };
}
