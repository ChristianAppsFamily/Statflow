import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { PlayerProfile } from '@/types';
import { checkAndShowPlayerThresholdInterstitial } from '@/services/ads';

const PLAYERS_KEY = 'statflow_players';
const ACTIVE_PLAYER_KEY = 'statflow_active_player';

export const [PlayerProvider, usePlayers] = createContextHook(() => {
  const queryClient = useQueryClient();

  const playersQuery = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(PLAYERS_KEY);
      return stored ? (JSON.parse(stored) as PlayerProfile[]) : [];
    },
  });

  const activePlayerIdQuery = useQuery({
    queryKey: ['activePlayerId'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(ACTIVE_PLAYER_KEY);
      return stored || null;
    },
  });

  const savePlayersMutation = useMutation({
    mutationFn: async (players: PlayerProfile[]) => {
      await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
      return players;
    },
    onSuccess: (players) => {
      queryClient.setQueryData(['players'], players);
    },
  });

  const saveActivePlayerIdMutation = useMutation({
    mutationFn: async (playerId: string | null) => {
      if (playerId) {
        await AsyncStorage.setItem(ACTIVE_PLAYER_KEY, playerId);
      } else {
        await AsyncStorage.removeItem(ACTIVE_PLAYER_KEY);
      }
      return playerId;
    },
    onSuccess: (playerId) => {
      queryClient.setQueryData(['activePlayerId'], playerId);
    },
  });

  const addPlayer = useCallback((player: PlayerProfile) => {
    console.log('[PlayerContext] Adding player:', player.name);
    const current = playersQuery.data || [];
    const updated = [player, ...current];
    savePlayersMutation.mutate(updated);
    if (current.length === 0) {
      saveActivePlayerIdMutation.mutate(player.id);
    }

    // Check and show player threshold interstitial (4th+ player, one-time)
    try {
      void checkAndShowPlayerThresholdInterstitial(updated.length);
    } catch (e) {
      console.log('[PlayerContext] Ad trigger error:', e);
    }
  }, [playersQuery.data, savePlayersMutation, saveActivePlayerIdMutation]);

  const updatePlayer = useCallback((playerId: string, updates: Partial<PlayerProfile>) => {
    console.log('[PlayerContext] Updating player:', playerId);
    const current = playersQuery.data || [];
    const updated = current.map((p: PlayerProfile) =>
      p.id === playerId ? { ...p, ...updates } : p
    );
    savePlayersMutation.mutate(updated);
  }, [playersQuery.data, savePlayersMutation]);

  const deletePlayer = useCallback((playerId: string) => {
    console.log('[PlayerContext] Deleting player:', playerId);
    const current = playersQuery.data || [];
    const currentActiveId = activePlayerIdQuery.data || null;
    const updated = current.filter((p: PlayerProfile) => p.id !== playerId);
    savePlayersMutation.mutate(updated);
    if (currentActiveId === playerId) {
      const nextPlayer = updated.length > 0 ? updated[0].id : null;
      saveActivePlayerIdMutation.mutate(nextPlayer);
    }
  }, [playersQuery.data, activePlayerIdQuery.data, savePlayersMutation, saveActivePlayerIdMutation]);

  const setActivePlayer = useCallback((playerId: string | null) => {
    console.log('[PlayerContext] Setting active player:', playerId);
    saveActivePlayerIdMutation.mutate(playerId);
  }, [saveActivePlayerIdMutation]);

  const activePlayerId = (activePlayerIdQuery.data || null) as string | null;

  return useMemo(() => {
    const players = (playersQuery.data || []) as PlayerProfile[];
    const activePlayer = players.find((p) => p.id === activePlayerId) || null;

    return {
      players,
      activePlayerId,
      activePlayer,
      isLoading: playersQuery.isLoading || activePlayerIdQuery.isLoading,
      addPlayer,
      updatePlayer,
      deletePlayer,
      setActivePlayer,
    };
  }, [
    playersQuery.data,
    activePlayerId,
    playersQuery.isLoading,
    activePlayerIdQuery.isLoading,
    addPlayer,
    updatePlayer,
    deletePlayer,
    setActivePlayer,
  ]);
});
