import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { AppSettings, Session, Highlight } from '@/types';
import { checkAndShowSportsThresholdInterstitial, addTrackedSport } from '@/services/ads';

const SESSIONS_KEY = 'statflow_sessions';
const SETTINGS_KEY = 'statflow_settings';
const HIGHLIGHTS_KEY = 'statflow_highlights';

const defaultSettings: AppSettings = {
  dailyVerseEnabled: true,
  hapticsEnabled: true,
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
      return stored ? JSON.parse(stored) : defaultSettings;
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

  const addSession = useCallback((session: Session) => {
    const sessions = sessionsQuery.data || [];
    const updated = [session, ...sessions];
    saveSessionsMutation.mutate(updated);
    
    // Track unique sports and check for sports threshold interstitial (3rd unique sport, one-time)
    try {
      void addTrackedSport(session.sport).then((trackedSports) => {
        void checkAndShowSportsThresholdInterstitial(trackedSports);
      });
    } catch (e) {
      console.log('[AppContext] Sports tracking error:', e);
    }
  }, [sessionsQuery.data, saveSessionsMutation]);

  const updateSession = useCallback((sessionId: string, updates: Partial<Session>) => {
    const sessions = sessionsQuery.data || [];
    const updated = sessions.map((s: Session) =>
      s.id === sessionId ? { ...s, ...updates } : s
    );
    saveSessionsMutation.mutate(updated);
  }, [sessionsQuery.data, saveSessionsMutation]);

  const deleteSession = useCallback((sessionId: string) => {
    const sessions = sessionsQuery.data || [];
    const updated = sessions.filter((s: Session) => s.id !== sessionId);
    saveSessionsMutation.mutate(updated);
  }, [sessionsQuery.data, saveSessionsMutation]);

  const resetAllData = useCallback(async () => {
    await AsyncStorage.multiRemove([SESSIONS_KEY, SETTINGS_KEY, HIGHLIGHTS_KEY]);
    queryClient.setQueryData(['highlights'], []);
    queryClient.setQueryData(['sessions'], []);
    queryClient.setQueryData(['settings'], defaultSettings);
  }, [queryClient]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    const current = settingsQuery.data || defaultSettings;
    saveSettingsMutation.mutate({ ...current, ...updates });
  }, [settingsQuery.data, saveSettingsMutation]);

  const addHighlight = useCallback((highlight: Highlight) => {
    const highlights = highlightsQuery.data || [];
    const updated = [highlight, ...highlights];
    saveHighlightsMutation.mutate(updated);
  }, [highlightsQuery.data, saveHighlightsMutation]);

  const updateHighlight = useCallback((highlightId: string, updates: Partial<Highlight>) => {
    const highlights = highlightsQuery.data || [];
    const updated = highlights.map((h: Highlight) =>
      h.id === highlightId ? { ...h, ...updates } : h
    );
    saveHighlightsMutation.mutate(updated);
  }, [highlightsQuery.data, saveHighlightsMutation]);

  const deleteHighlight = useCallback((highlightId: string) => {
    const highlights = highlightsQuery.data || [];
    const updated = highlights.filter((h: Highlight) => h.id !== highlightId);
    saveHighlightsMutation.mutate(updated);
  }, [highlightsQuery.data, saveHighlightsMutation]);

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
    updateHighlight,
    deleteHighlight,
  ]);
});
