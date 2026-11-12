import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { AppSettings, Session, Highlight } from '@/types';
import { checkAndShowSportsThresholdInterstitial, addTrackedSport } from '@/services/ads';
import { checkReviewPromptAfterStatSaved } from '@/services/appReview';

const SESSIONS_KEY = 'statflow_sessions';
const SETTINGS_KEY = 'statflow_settings';
const HIGHLIGHTS_KEY = 'statflow_highlights';

const defaultSettings: AppSettings = {
  dailyVerseEnabled: true,
  hapticsEnabled: true,
  themeMode: 'dark',
};

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SESSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (!stored) return defaultSettings;
      const parsed = JSON.parse(stored) as Partial<AppSettings>;
      return {
        ...defaultSettings,
        ...parsed,
        themeMode:
          parsed.themeMode === 'light' ||
          parsed.themeMode === 'dark' ||
          parsed.themeMode === 'system'
            ? parsed.themeMode
            : defaultSettings.themeMode,
      };
    },
  });

  const highlightsQuery = useQuery({
    queryKey: ['highlights'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(HIGHLIGHTS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const saveHighlightsMutation = useMutation({
    mutationFn: async (highlights: Highlight[]) => {
      await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
      return highlights;
    },
    onSuccess: (highlights) => {
      queryClient.setQueryData(['highlights'], highlights);
    },
  });

  const saveSessionsMutation = useMutation({
    mutationFn: async (sessions: Session[]) => {
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      return sessions;
    },
    onSuccess: (sessions) => {
      queryClient.setQueryData(['sessions'], sessions);
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: AppSettings) => {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return settings;
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['settings'], settings);
    },
  });

  const getSessions = useCallback((): Session[] => {
    return (queryClient.getQueryData(['sessions']) as Session[] | undefined) || [];
  }, [queryClient]);

  const getHighlights = useCallback((): Highlight[] => {
    return (queryClient.getQueryData(['highlights']) as Highlight[] | undefined) || [];
  }, [queryClient]);

  const addSession = useCallback((session: Session) => {
    const updated = [session, ...getSessions()];
    queryClient.setQueryData(['sessions'], updated);
    saveSessionsMutation.mutate(updated);

    void addTrackedSport(session.sport).then((trackedSports) => {
      void checkAndShowSportsThresholdInterstitial(trackedSports);
    });

    void checkReviewPromptAfterStatSaved();
  }, [getSessions, queryClient, saveSessionsMutation]);

  const updateSession = useCallback((sessionId: string, updates: Partial<Session>) => {
    const updated = getSessions().map((s) =>
      s.id === sessionId ? { ...s, ...updates } : s
    );
    queryClient.setQueryData(['sessions'], updated);
    saveSessionsMutation.mutate(updated);
  }, [getSessions, queryClient, saveSessionsMutation]);

  const deleteSession = useCallback((sessionId: string) => {
    const updatedSessions = getSessions().filter((s) => s.id !== sessionId);
    queryClient.setQueryData(['sessions'], updatedSessions);
    saveSessionsMutation.mutate(updatedSessions);

    const updatedHighlights = getHighlights().filter((h) => h.sessionId !== sessionId);
    queryClient.setQueryData(['highlights'], updatedHighlights);
    saveHighlightsMutation.mutate(updatedHighlights);
  }, [getSessions, getHighlights, queryClient, saveSessionsMutation, saveHighlightsMutation]);

  const resetAllData = useCallback(async () => {
    await AsyncStorage.multiRemove([SESSIONS_KEY, SETTINGS_KEY, HIGHLIGHTS_KEY]);
    queryClient.setQueryData(['highlights'], []);
    queryClient.setQueryData(['sessions'], []);
    queryClient.setQueryData(['settings'], defaultSettings);
  }, [queryClient]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    const current =
      (queryClient.getQueryData(['settings']) as AppSettings | undefined) || defaultSettings;
    const next = { ...current, ...updates };
    queryClient.setQueryData(['settings'], next);
    saveSettingsMutation.mutate(next);
  }, [queryClient, saveSettingsMutation]);

  const addHighlight = useCallback((highlight: Highlight) => {
    const updated = [highlight, ...getHighlights()];
    queryClient.setQueryData(['highlights'], updated);
    saveHighlightsMutation.mutate(updated);
  }, [getHighlights, queryClient, saveHighlightsMutation]);

  const addHighlights = useCallback((newHighlights: Highlight[]) => {
    if (newHighlights.length === 0) return;
    const updated = [...newHighlights, ...getHighlights()];
    queryClient.setQueryData(['highlights'], updated);
    saveHighlightsMutation.mutate(updated);
  }, [getHighlights, queryClient, saveHighlightsMutation]);

  const updateHighlight = useCallback((highlightId: string, updates: Partial<Highlight>) => {
    const updated = getHighlights().map((h) =>
      h.id === highlightId ? { ...h, ...updates } : h
    );
    queryClient.setQueryData(['highlights'], updated);
    saveHighlightsMutation.mutate(updated);
  }, [getHighlights, queryClient, saveHighlightsMutation]);

  const deleteHighlight = useCallback((highlightId: string) => {
    const updated = getHighlights().filter((h) => h.id !== highlightId);
    queryClient.setQueryData(['highlights'], updated);
    saveHighlightsMutation.mutate(updated);
  }, [getHighlights, queryClient, saveHighlightsMutation]);

  return useMemo(() => ({
    sessions: (sessionsQuery.data || []) as Session[],
    settings: (settingsQuery.data || defaultSettings) as AppSettings,
    highlights: (highlightsQuery.data || []) as Highlight[],
    isLoading: sessionsQuery.isLoading || settingsQuery.isLoading || highlightsQuery.isLoading,
    addSession,
    updateSession,
    deleteSession,
    resetAllData,
    updateSettings,
    addHighlight,
    addHighlights,
    updateHighlight,
    deleteHighlight,
  }), [
    sessionsQuery.data,
    settingsQuery.data,
    highlightsQuery.data,
    sessionsQuery.isLoading,
    settingsQuery.isLoading,
    highlightsQuery.isLoading,
    addSession,
    updateSession,
    deleteSession,
    resetAllData,
    updateSettings,
    addHighlight,
    addHighlights,
    updateHighlight,
    deleteHighlight,
  ]);
});
