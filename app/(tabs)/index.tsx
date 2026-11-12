import { useRouter } from 'expo-router';
import { Home, Users, ChevronRight, History } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { usePlayers } from '@/contexts/PlayerContext';
import { useDailyVerse } from '@/hooks/useDailyVerse';
import { ThemeColors } from '@/constants/colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SPORTS_CONFIG } from '@/constants/sports';
import { Session } from '@/types';
import BannerAdComponent from '@/components/BannerAd';
import { formatSessionDate } from '@/utils/sessionDate';

export default function HomeScreen() {
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { settings, sessions } = useApp();
  const { activePlayer, activePlayerId, players } = usePlayers();
  const todaysVerse = useDailyVerse();
  const insets = useSafeAreaInsets();

  const recentGames = useMemo(() => {
    const filtered = activePlayerId
      ? sessions.filter((s) => s.playerId === activePlayerId)
      : sessions;
    return filtered.slice(0, 3);
  }, [sessions, activePlayerId]);

  const getPlayerInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const getPlayerForSession = (playerId?: string) => {
    if (!playerId) return null;
    return players.find((p) => p.id === playerId) ?? null;
  };

  const getTopStats = (session: Session) => {
    const config = SPORTS_CONFIG[session.sport];
    const allStats = [
      ...config.stats.map((stat) => ({ key: stat.key, shortLabel: stat.shortLabel })),
      ...Object.keys(session.stats)
        .filter((key) => !config.stats.some((s) => s.key === key))
        .map((key) => ({ key, shortLabel: key.toUpperCase().slice(0, 3) })),
    ];
    return allStats.slice(0, 4);
  };

  return (
    <View style={styles.outerContainer}>
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      {settings.dailyVerseEnabled && todaysVerse && (
        <View style={styles.verseCard}>
          <Text style={styles.verseLabel}>TODAY&apos;S VERSE</Text>
          <Text style={styles.verseText}>{todaysVerse.text}</Text>
          <Text style={styles.verseReference}>— {todaysVerse.reference}</Text>
        </View>
      )}

      {activePlayer && (
        <View style={styles.activePlayerBanner}>
          <View style={styles.activePlayerDot} />
          <Text style={styles.activePlayerText}>
            Tracking: <Text style={styles.activePlayerName}>{activePlayer.name}</Text>
          </Text>
        </View>
      )}

      <Text style={styles.subtitle}>Play with purpose.</Text>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/players')}
        >
          <Users size={24} color={colors.navy} />
          <Text style={styles.primaryButtonText}>Player Profiles</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/add-stats')}
        >
          <Home size={20} color={colors.gold} />
          <Text style={styles.secondaryButtonText}>Start a New Game</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tertiaryButton}
          onPress={() => router.push('/history')}
        >
          <History size={20} color={colors.gold} />
          <Text style={styles.tertiaryButtonText}>Game History</Text>
        </TouchableOpacity>
      </View>

      {recentGames.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Games</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/history')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={14} color={colors.gold} />
            </TouchableOpacity>
          </View>
          {recentGames.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={styles.recentCard}
              onPress={() =>
                router.push({
                  pathname: '/session-detail',
                  params: { sessionId: session.id },
                })
              }
            >
              <View style={styles.recentCardTop}>
                {(() => {
                  const player = getPlayerForSession(session.playerId);
                  if (player?.avatarUri) {
                    return (
                      <Image
                        source={{ uri: player.avatarUri }}
                        style={styles.avatarImage}
                      />
                    );
                  }
                  if (player) {
                    return (
                      <View style={styles.initialsCircle}>
                        <Text style={styles.initialsText}>
                          {getPlayerInitials(player.name)}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })()}
                <View style={styles.recentCardInfo}>
                  <View style={styles.recentCardNameRow}>
                    <Text style={styles.recentSport}>{SPORTS_CONFIG[session.sport].name}</Text>
                    {session.outcome && (
                      <View
                        style={[
                          styles.outcomeDot,
                          session.outcome === 'win' ? styles.outcomeDotWin : styles.outcomeDotLoss,
                        ]}
                      >
                        <Text style={styles.outcomeDotText}>
                          {session.outcome === 'win' ? 'W' : 'L'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.recentMeta}>
                    {formatSessionDate(session.date, {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {session.opponent ? ` vs ${session.opponent}` : ''}
                  </Text>
                </View>
                {(session.teamScore !== undefined || session.opponentScore !== undefined) && (
                  <Text style={styles.recentScore}>
                    {session.teamScore ?? 0}-{session.opponentScore ?? 0}
                  </Text>
                )}
              </View>
              <View style={styles.recentStatsRow}>
                {getTopStats(session).map((stat) => (
                  <View key={stat.key} style={styles.recentStatItem}>
                    <Text style={styles.recentStatValue}>{session.stats[stat.key] || 0}</Text>
                    <Text style={styles.recentStatLabel}>{stat.shortLabel}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Count your progress.</Text>
        <Text style={styles.footerText}>Play for His glory.</Text>
      </View>
    </ScrollView>
    {/* BOTTOM BANNER AD */}
    <BannerAdComponent position="bottom" />
    </View>
  );
}

function createStyles(Colors: ThemeColors) {
  return StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  verseCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.gold,
  },
  verseLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  verseText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  verseReference: {
    fontSize: 12,
    color: Colors.gold,
    fontWeight: '600' as const,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  actionsContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButtonText: {
    color: Colors.navy,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  secondaryButtonText: {
    color: Colors.gold,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  tertiaryButtonText: {
    color: Colors.gold,
    fontSize: 16,
    fontWeight: '600' as const,
  },

  footer: {
    marginTop: 48,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  recentSection: {
    marginTop: 32,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  recentCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  recentCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
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
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  initialsText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  recentCardInfo: {
    flex: 1,
  },
  recentCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentSport: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  outcomeDot: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  outcomeDotWin: {
    backgroundColor: '#065f46',
  },
  outcomeDotLoss: {
    backgroundColor: '#7f1d1d',
  },
  outcomeDotText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  recentMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  recentScore: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  recentStatsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 46,
  },
  recentStatItem: {
    alignItems: 'center',
    minWidth: 40,
  },
  recentStatValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  recentStatLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  activePlayerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  activePlayerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
  },
  activePlayerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  activePlayerName: {
    color: Colors.gold,
    fontWeight: '700' as const,
  },
});
}

