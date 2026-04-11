import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import {
  getCachedThemeMode,
  subscribeThemeMode,
  type ThemeMode,
} from '@/utils/settingsService';

const ENV_DEFAULT_THEME = process.env.EXPO_PUBLIC_DEFAULT_THEME;
const DEFAULT_THEME_FALLBACK: 'light' | 'dark' =
  ENV_DEFAULT_THEME === 'dark' ? 'dark' : 'light';

function resolveTheme(
  themeMode: ThemeMode | null,
  systemTheme: 'light' | 'dark' | null | undefined,
): 'light' | 'dark' {
  if (themeMode === 'light' || themeMode === 'dark') return themeMode;
  if (themeMode === 'system') {
    return systemTheme === 'dark' ? 'dark' : DEFAULT_THEME_FALLBACK;
  }
  return DEFAULT_THEME_FALLBACK;
}

export function useColorScheme(): 'light' | 'dark' {
  const systemTheme = useSystemColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode | null>(null);

  useEffect(() => {
    let mounted = true;
    getCachedThemeMode()
      .then((value) => {
        if (mounted) setThemeMode(value);
      })
      .catch(() => null);

    const unsubscribe = subscribeThemeMode((nextTheme) => {
      setThemeMode(nextTheme);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return resolveTheme(themeMode, systemTheme);
}
