import { useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { DarkColors, LightColors, ThemeColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { ThemeMode } from '@/types';

export function useThemeColors() {
  const { settings, updateSettings } = useApp();
  const systemScheme = useColorScheme();
  const themeMode: ThemeMode = settings.themeMode ?? 'dark';

  const resolvedScheme: 'light' | 'dark' = useMemo(() => {
    if (themeMode === 'light') return 'light';
    if (themeMode === 'dark') return 'dark';
    return systemScheme === 'light' ? 'light' : 'dark';
  }, [themeMode, systemScheme]);

  const colors: ThemeColors = resolvedScheme === 'light' ? LightColors : DarkColors;

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      updateSettings({ themeMode: mode });
    },
    [updateSettings]
  );

  return {
    colors,
    resolvedScheme,
    themeMode,
    setThemeMode,
  };
}
