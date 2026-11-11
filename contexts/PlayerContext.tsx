import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { PlayerProfile } from '@/types';
import { checkAndShowPlayerThresholdInterstitial } from '@/services/ads';

const PLAYERS_KEY = 'statflow_players';
const ACTIVE_PLAYER_KEY = 'statflow_active_player';

function log(...args: unknown[]) {
  if (__DEV__) console.log(...args);
}

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

  const getPlayers = useCallback((): PlayerProfile[] => {
    return (queryClient.getQueryData(['players']) as PlayerProfile[] | undefined) || [];
  }, [queryClient]);

  const addPlayer = useCallback((player: PlayerProfile) => {
    log('[PlayerContext] Adding player:', player.name);
    const current = getPlayers();
    const updated = [player, ...current];
    queryClient.setQueryData(['players'], updated);
    savePlayersMutation.mutate(updated);
    if (current.length === 0) {
      saveActivePlayerIdMutation.mutate(player.id);
    }

    void checkAndShowPlayerThresholdInterstitial(updated.length);
  }, [getPlayers, queryClient, savePlayersMutation, saveActivePlayerIdMutation]);

  const updatePlayer = useCallback((playerId: string, updates: Partial<PlayerProfile>) => {
    log('[PlayerContext] Updating player:', playerId);
    const updated = getPlayers().map((p) =>
      p.id === playerId ? { ...p, ...updates } : p
    );
    queryClient.setQueryData(['players'], updated);
    savePlayersMutation.mutate(updated);
  }, [getPlayers, queryClient, savePlayersMutation]);

  const deletePlayer = useCallback((playerId: string) => {
    log('[PlayerContext] Deleting player:', playerId);
    const current = getPlayers();
    const currentActiveId =
      (queryClient.getQueryData(['activePlayerId']) as string | null | undefined) || null;
    const updated = current.filter((p) => p.id !== playerId);
    queryClient.setQueryData(['players'], updated);
    savePlayersMutation.mutate(updated);
    if (currentActiveId === playerId) {
      const nextPlayer = updated.length > 0 ? updated[0].id : null;
      saveActivePlayerIdMutation.mutate(nextPlayer);
    }
  }, [getPlayers, queryClient, savePlayersMutation, saveActivePlayerIdMutation]);

  const setActivePlayer = useCallback((playerId: string | null) => {
    log('[PlayerContext] Setting active player:', playerId);
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
