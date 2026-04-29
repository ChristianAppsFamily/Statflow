import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { usePlayers } from '@/contexts/PlayerContext';
import { SPORTS_CONFIG } from '@/constants/sports';
import { Sport, Session } from '@/types';
import { Colors } from '@/constants/colors';
import BannerAdComponent from '@/components/BannerAd';

type FilterOption = 'all' | Sport;

export default function HistoryScreen() {
  const router = useRouter();
  const { sessions, highlights } = useApp();
  const { activePlayerId, players } = usePlayers();
  const [filter, setFilter] = useState<FilterOption>('all');
  const insets = useSafeAreaInsets();

  const playerSessions = useMemo(() => {
    if (!activePlayerId) return sessions;
    return sessions.filter((s) => s.playerId === activePlayerId);
  }, [sessions, activePlayerId]);

  const sessionHighlightMap = useMemo(() => {
    const map = new Set<string>();
    highlights.forEach((h) => {
      if (h.sessionId) map.add(h.sessionId);
    });
    return map;
  }, [highlights]);

  const getPlayerInitials = (playerId?: string) => {
    if (!playerId) return null;
    const player = players.find((p) => p.id === playerId);
    if (!player) return null;
    const parts = player.name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const filteredSessions = useMemo(() => {
    if (filter === 'all') return playerSessions;
    return playerSessions.filter((s) => s.sport === filter);
  }, [playerSessions, filter]);

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatSummary = (session: Session) => {
    const config = SPORTS_CONFIG[session.sport];
    const allStats = [
      ...config.stats.map((stat) => ({ key: stat.key, shortLabel: stat.shortLabel })),
      ...Object.keys(session.stats)
        .filter((key) => !config.stats.some((s) => s.key === key))
        .map((key) => ({ key, shortLabel: key.toUpperCase().slice(0, 3) })),
    ];
    const topStats = allStats.slice(0, 6);
    return topStats;
  };

  const filters: { value: FilterOption; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'basketball', label: '🏀' },
    { value: 'football', label: '🏈' },
    { value: 'soccer', label: '⚽' },
    { value: 'baseball', label: '⚾' },
    { value: 'volleyball', label: '🏐' },
    { value: 'hockey', label: '🏒' },
    { value: 'golf', label: '⛳' },
    { value: 'tennis', label: '🎾' },
  ];

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
              onPress={() => setFilter(f.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === f.value && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredSessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Games Yet</Text>
          <Text style={styles.emptyText}>
            {filter === 'all'
              ? 'Start tracking your stats to see them here.'
              : `No ${SPORTS_CONFIG[filter as Sport]?.name} games recorded yet.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.sessionCard}
              onPress={() =>
                router.push({
                  pathname: '/session-detail',
                  params: { sessionId: item.id },
                })
              }
            >
              <View style={styles.sessionHeader}>
                <View style={styles.sessionTitleRow}>
                  {getPlayerInitials(item.playerId) ? (
                    <View style={styles.initialsCircle}>
                      <Text style={styles.initialsText}>{getPlayerInitials(item.playerId)}</Text>
                    </View>
                  ) : (
                    <Text style={styles.sessionIcon}>
                      {SPORTS_CONFIG[item.sport].icon}
                    </Text>
                  )}
                  <View style={styles.sessionInfo}>
                    <View style={styles.sportRow}>
                      <Text style={styles.sessionSport}>
                        {SPORTS_CONFIG[item.sport].name}
                      </Text>
                      {item.outcome && (
                        <View
                          style={[
                            styles.outcomeBadge,
                            item.outcome === 'win'
                              ? styles.outcomeBadgeWin
                              : styles.outcomeBadgeLoss,
                          ]}
                        >
                          <Text style={styles.outcomeBadgeText}>
                            {item.outcome === 'win' ? 'W' : 'L'}
                          </Text>
                        </View>
                      )}
                      {sessionHighlightMap.has(item.id) && (
                        <View style={styles.highlightBadge}>
                          <Star size={10} color={Colors.gold} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.sessionDate}>{formatDate(item.date)}</Text>
                  </View>
                  {(item.teamScore !== undefined || item.opponentScore !== undefined) && (
                    <View style={styles.scoreContainer}>
                      <Text style={styles.scoreText}>
                        {item.teamScore ?? 0} - {item.opponentScore ?? 0}
                      </Text>
                    </View>
                  )}
                </View>
                {item.opponent && (
                  <Text style={styles.opponent}>vs {item.opponent}</Text>
                )}
              </View>
              <View style={styles.statsRow}>
                {getStatSummary(item).map((stat) => (
                  <View key={stat.key} style={styles.statPill}>
                    <Text style={styles.statPillLabel}>{stat.shortLabel}</Text>
                    <Text style={styles.statPillValue}>{item.stats[stat.key] || 0}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      {/* BOTTOM BANNER AD */}
      <BannerAdComponent position="bottom" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
  },
  filterChipActive: {
    backgroundColor: Colors.gold,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.navy,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  sessionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.gold,
  },
  sessionHeader: {
    marginBottom: 12,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  sessionIcon: {
    fontSize: 32,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionSport: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  outcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  outcomeBadgeWin: {
    backgroundColor: '#065f46',
  },
  outcomeBadgeLoss: {
    backgroundColor: '#7f1d1d',
  },
  outcomeBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  scoreContainer: {
    backgroundColor: Colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  sessionDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  opponent: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  statPillLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  statPillValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  initialsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.goldFaded,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  initialsText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  highlightBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.goldFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
