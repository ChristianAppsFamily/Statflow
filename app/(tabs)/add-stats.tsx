import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Minus, Save, RotateCcw, X, UserPlus, Star, Link } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SPORTS_CONFIG, SPORT_OPTIONS } from '@/constants/sports';
import { useApp } from '@/contexts/AppContext';
import { usePlayers } from '@/contexts/PlayerContext';
import { Sport, Session, GameOutcome, Highlight } from '@/types';
import { Colors } from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showInterstitialAd } from '@/services/ads';
import BannerAdComponent from '@/components/BannerAd';

const DAILY_GAMES_KEY = 'statflow_daily_games';

async function incrementDailyGames(): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = await AsyncStorage.getItem(DAILY_GAMES_KEY);
    let data: { count: number; date: string } = raw ? JSON.parse(raw) : { count: 0, date: today };
    if (data.date !== today) data = { count: 0, date: today };
    data.count += 1;
    await AsyncStorage.setItem(DAILY_GAMES_KEY, JSON.stringify(data));
    return data.count;
  } catch { return 0; }
}

export default function AddStatsScreen() {
  const router = useRouter();
  const { addSession, settings, addHighlight } = useApp();
  const { activePlayerId, players } = usePlayers();
  const insets = useSafeAreaInsets();
  
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState('');
  const [notes, setNotes] = useState('');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [teamScore, setTeamScore] = useState('');
  const [customStats, setCustomStats] = useState<{ key: string; label: string }[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customStatName, setCustomStatName] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [showHighlightForm, setShowHighlightForm] = useState(false);
  const [hlTitle, setHlTitle] = useState('');
  const [hlUrl, setHlUrl] = useState('');
  const [hlNotes, setHlNotes] = useState('');
  const [gameHighlights, setGameHighlights] = useState<{ title: string; url: string; notes?: string }[]>([]);

  const sportConfig = selectedSport ? SPORTS_CONFIG[selectedSport] : null;

  const updateStat = (key: string, delta: number) => {
    if (settings.hapticsEnabled && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setStats((prev) => {
      const newValue = (prev[key] || 0) + delta;
      return { ...prev, [key]: Math.max(0, newValue) };
    });
  };

  const handleReset = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Reset all stats?');
      if (confirmed) {
        setStats({});
        setOpponent('');
        setNotes('');
        setOutcome(null);
        setTeamScore('');
        setOpponentScore('');
        setCustomStats([]);
        setShowCustomInput(false);
        setCustomStatName('');
      }
    } else {
      Alert.alert('Reset Stats', 'Are you sure you want to reset all stats?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setStats({});
            setOpponent('');
            setNotes('');
            setOutcome(null);
            setTeamScore('');
            setOpponentScore('');
            setCustomStats([]);
            setShowCustomInput(false);
            setCustomStatName('');
          },
        },
      ]);
    }
  };

  const handleSave = () => {
    if (!selectedSport) return;

    const allZero = Object.values(stats).every((val) => val === 0);
    const hasNoNotes = !notes.trim() && !opponent.trim();

    if (allZero && hasNoNotes) {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm('All stats are zero. Save anyway?');
        if (!confirmed) return;
      } else {
        Alert.alert(
          'Empty Session',
          'All stats are zero. Save anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Save', onPress: () => saveSession() },
          ]
        );
        return;
      }
    }

    saveSession();
  };

  const saveSession = () => {
    if (!selectedSport) return;

    const sessionId = Date.now().toString();
    const session: Session = {
      id: sessionId,
      sport: selectedSport,
      date: new Date(date).toISOString(),
      opponent: opponent.trim() || undefined,
      notes: notes.trim() || undefined,
      stats,
      outcome: outcome || undefined,
      teamScore: teamScore ? parseInt(teamScore, 10) : undefined,
      opponentScore: opponentScore ? parseInt(opponentScore, 10) : undefined,
      playerId: activePlayerId || undefined,
    };

    addSession(session);

    gameHighlights.forEach((hl, idx) => {
      const highlight: Highlight = {
        id: `${sessionId}_hl_${idx}`,
        title: hl.title,
        type: 'link',
        url: hl.url,
        createdAt: new Date().toISOString(),
        sport: selectedSport,
        notes: hl.notes || undefined,
        sessionId,
        playerId: activePlayerId || undefined,
      };
      addHighlight(highlight);
    });

    if (settings.hapticsEnabled && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Rule #3: Show interstitial after 3+ games saved in 24h
    void incrementDailyGames().then((count) => {
      console.log('[AddStats] Daily game count:', count);
      if (count > 3) void showInterstitialAd();
    });

    setSelectedSport(null);
    setStats({});
    setOpponent('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setOutcome(null);
    setTeamScore('');
    setOpponentScore('');
    setCustomStats([]);
    setShowCustomInput(false);
    setCustomStatName('');
    setGameHighlights([]);
    setShowHighlightForm(false);
    setHlTitle('');
    setHlUrl('');
    setHlNotes('');

    router.push('/history');
  };

  if (!activePlayerId || players.length === 0) {
    return (
      <View style={styles.noPlayerContainer}>
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
          <View style={styles.noPlayerState}>
            <View style={styles.noPlayerIconCircle}>
              <UserPlus size={40} color={Colors.gold} />
            </View>
            <Text style={styles.noPlayerTitle}>Create a Player First</Text>
            <Text style={styles.noPlayerSubtitle}>
              You need to add a player profile before starting a new game. Each game's stats will be saved under the active player.
            </Text>
            <TouchableOpacity
              style={styles.noPlayerButton}
              onPress={() => router.push('/players')}
            >
              <UserPlus size={20} color={Colors.navy} />
              <Text style={styles.noPlayerButtonText}>Go to Players</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        {/* BOTTOM BANNER AD — above bottom safe area, near "Go to Players" button */}
        <BannerAdComponent position="bottom" />
      </View>
    );
  }

  if (!selectedSport) {
    return (
      <View style={[styles.sportPickerOuter, { paddingTop: insets.top }]}>
        {/* Header Banner Ad — shown above the sport selection grid */}
        <BannerAdComponent position="top" />
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: 16 }]}>
          <Text style={styles.title}>Choose Your Sport</Text>
          <View style={styles.sportGrid}>
            {SPORT_OPTIONS.map((sport) => (
              <TouchableOpacity
                key={sport.value}
                style={styles.sportCard}
                onPress={() => setSelectedSport(sport.value)}
              >
                <Text style={styles.sportIcon}>{sport.label.split(' ')[0]}</Text>
                <Text style={styles.sportName}>{sport.label.split(' ')[1]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* TOP BANNER AD */}
      <BannerAdComponent position="top" />
    <ScrollView style={styles.scrollInner} contentContainerStyle={[styles.content, { paddingTop: 16 }]}>
      <View style={styles.header}>
        <Text style={styles.sportTitle}>
          {sportConfig?.icon} {sportConfig?.name}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setSelectedSport(null);
            setStats({});
          }}
          style={styles.changeButton}
        >
          <Text style={styles.changeButtonText}>Change Sport</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metaSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>DATE</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>OPPONENT (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            value={opponent}
            onChangeText={setOpponent}
            placeholder="Team name or opponent"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>NOTES (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Game notes, feelings, etc."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>GAME RESULT</Text>
      <View style={styles.gameResultSection}>
        <View style={styles.outcomeRow}>
          <TouchableOpacity
            style={[
              styles.outcomeButton,
              outcome === 'win' && styles.outcomeButtonWin,
            ]}
            onPress={() => {
              if (settings.hapticsEnabled && Platform.OS !== 'web') {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setOutcome(outcome === 'win' ? null : 'win');
            }}
          >
            <Text
              style={[
                styles.outcomeButtonText,
                outcome === 'win' && styles.outcomeButtonTextActive,
              ]}
            >
              W
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.outcomeButton,
              outcome === 'loss' && styles.outcomeButtonLoss,
            ]}
            onPress={() => {
              if (settings.hapticsEnabled && Platform.OS !== 'web') {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setOutcome(outcome === 'loss' ? null : 'loss');
            }}
          >
            <Text
              style={[
                styles.outcomeButtonText,
                outcome === 'loss' && styles.outcomeButtonTextActive,
              ]}
            >
              L
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreInputGroup}>
            <Text style={styles.scoreLabel}>YOUR SCORE</Text>
            <TextInput
              style={styles.scoreInput}
              value={teamScore}
              onChangeText={(text) => setTeamScore(text.replace(/[^0-9]/g, ''))}
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>
          <Text style={styles.scoreDivider}>-</Text>
          <View style={styles.scoreInputGroup}>
            <Text style={styles.scoreLabel}>OPP SCORE</Text>
            <TextInput
              style={styles.scoreInput}
              value={opponentScore}
              onChangeText={(text) => setOpponentScore(text.replace(/[^0-9]/g, ''))}
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      <Text style={styles.statsTitle}>STATS</Text>
      <View style={styles.statsContainer}>
        {sportConfig?.stats.map((stat) => (
          <View key={stat.key} style={styles.statRow}>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statShort}>{stat.shortLabel}</Text>
            </View>
            <View style={styles.statControls}>
              <TouchableOpacity
                style={styles.statButton}
                onPress={() => updateStat(stat.key, -1)}
              >
                <Minus size={20} color={Colors.red} />
              </TouchableOpacity>
              <Text style={styles.statValue}>{stats[stat.key] || 0}</Text>
              <TouchableOpacity
                style={styles.statButton}
                onPress={() => updateStat(stat.key, 1)}
              >
                <Plus size={20} color={Colors.green} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {customStats.map((stat) => (
          <View key={stat.key} style={styles.statRow}>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statShort}>CUSTOM</Text>
            </View>
            <View style={styles.statControls}>
              <TouchableOpacity
                style={styles.removeCustomButton}
                onPress={() => {
                  setCustomStats((prev) => prev.filter((s) => s.key !== stat.key));
                  setStats((prev) => {
                    const next = { ...prev };
                    delete next[stat.key];
                    return next;
                  });
                }}
              >
                <X size={16} color={Colors.red} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statButton}
                onPress={() => updateStat(stat.key, -1)}
              >
                <Minus size={20} color={Colors.red} />
              </TouchableOpacity>
              <Text style={styles.statValue}>{stats[stat.key] || 0}</Text>
              <TouchableOpacity
                style={styles.statButton}
                onPress={() => updateStat(stat.key, 1)}
              >
                <Plus size={20} color={Colors.green} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {showCustomInput ? (
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customNameInput}
              value={customStatName}
              onChangeText={setCustomStatName}
              placeholder="Stat name (e.g. Steals)"
              placeholderTextColor={Colors.textSecondary}
              autoFocus
              onSubmitEditing={() => {
                const name = customStatName.trim();
                if (!name) return;
                const key = 'custom_' + name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
                setCustomStats((prev) => [...prev, { key, label: name }]);
                setCustomStatName('');
                setShowCustomInput(false);
              }}
            />
            <TouchableOpacity
              style={styles.customAddConfirm}
              onPress={() => {
                const name = customStatName.trim();
                if (!name) {
                  setShowCustomInput(false);
                  return;
                }
                const key = 'custom_' + name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
                setCustomStats((prev) => [...prev, { key, label: name }]);
                setCustomStatName('');
                setShowCustomInput(false);
              }}
            >
              <Plus size={20} color={Colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.customAddCancel}
              onPress={() => {
                setShowCustomInput(false);
                setCustomStatName('');
              }}
            >
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addCustomButton}
            onPress={() => setShowCustomInput(true)}
          >
            <Plus size={18} color={Colors.gold} />
            <Text style={styles.addCustomButtonText}>Add Custom Stat</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>GAME HIGHLIGHTS</Text>
      <View style={styles.highlightsContainer}>
        {gameHighlights.map((hl, idx) => (
          <View key={idx} style={styles.hlCard}>
            <View style={styles.hlCardIcon}>
              <Link size={14} color={Colors.gold} />
            </View>
            <View style={styles.hlCardContent}>
              <Text style={styles.hlCardTitle} numberOfLines={1}>{hl.title}</Text>
              {hl.notes ? <Text style={styles.hlCardNotes} numberOfLines={1}>{hl.notes}</Text> : null}
            </View>
            <TouchableOpacity
              style={styles.hlRemoveBtn}
              onPress={() => setGameHighlights((prev) => prev.filter((_, i) => i !== idx))}
            >
              <X size={14} color={Colors.red} />
            </TouchableOpacity>
          </View>
        ))}

        {showHighlightForm ? (
          <View style={styles.hlFormCard}>
            <View style={styles.hlFormHeader}>
              <Text style={styles.hlFormTitle}>Add Highlight Link</Text>
              <TouchableOpacity onPress={() => { setShowHighlightForm(false); setHlTitle(''); setHlUrl(''); setHlNotes(''); }}>
                <X size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.hlInputGroup}>
              <Text style={styles.hlInputLabel}>TITLE</Text>
              <TextInput
                style={styles.hlInput}
                value={hlTitle}
                onChangeText={setHlTitle}
                placeholder="e.g., Game-winning shot"
                placeholderTextColor={Colors.textSecondary}
                returnKeyType="done"
                blurOnSubmit
              />
            </View>
            <View style={styles.hlInputGroup}>
              <Text style={styles.hlInputLabel}>VIDEO URL</Text>
              <TextInput
                style={styles.hlInput}
                value={hlUrl}
                onChangeText={setHlUrl}
                placeholder="https://youtube.com/..."
                placeholderTextColor={Colors.textSecondary}
                keyboardType="url"
                autoCapitalize="none"
                returnKeyType="done"
                blurOnSubmit
              />
            </View>
            <View style={styles.hlInputGroup}>
              <Text style={styles.hlInputLabel}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[styles.hlInput, styles.hlTextArea]}
                value={hlNotes}
                onChangeText={setHlNotes}
                placeholder="Add notes..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={2}
                blurOnSubmit
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity
              style={styles.hlSaveBtn}
              onPress={() => {
                if (!hlTitle.trim()) {
                  Alert.alert('Missing Title', 'Please enter a title for this highlight.');
                  return;
                }
                if (!hlUrl.trim()) {
                  Alert.alert('Missing URL', 'Please enter a video link.');
                  return;
                }
                setGameHighlights((prev) => [...prev, { title: hlTitle.trim(), url: hlUrl.trim(), notes: hlNotes.trim() || undefined }]);
                setHlTitle('');
                setHlUrl('');
                setHlNotes('');
                setShowHighlightForm(false);
                if (settings.hapticsEnabled && Platform.OS !== 'web') {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            >
              <Plus size={16} color={Colors.navy} />
              <Text style={styles.hlSaveBtnText}>Add Highlight</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addHighlightButton}
            onPress={() => setShowHighlightForm(true)}
          >
            <Star size={16} color={Colors.gold} />
            <Text style={styles.addHighlightButtonText}>Add Game Highlight</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <RotateCcw size={18} color={Colors.textSecondary} />
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Save size={20} color={Colors.navy} />
          <Text style={styles.saveButtonText}>Save Session</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  noPlayerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  sportPickerOuter: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollInner: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 24,
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  sportCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.cardBorder,
  },
  sportIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  sportName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sportTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  changeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  changeButtonText: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  metaSection: {
    gap: 16,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  gameResultSection: {
    marginBottom: 32,
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  outcomeButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.cardBorder,
  },
  outcomeButtonWin: {
    backgroundColor: '#065f46',
    borderColor: Colors.green,
  },
  outcomeButtonLoss: {
    backgroundColor: '#7f1d1d',
    borderColor: Colors.red,
  },
  outcomeButtonText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  outcomeButtonTextActive: {
    color: Colors.textPrimary,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreInputGroup: {
    flex: 1,
    gap: 8,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  scoreInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '700' as const,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  scoreDivider: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginTop: 20,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  statsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
  },
  statInfo: {
    gap: 4,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  statShort: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  statControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.background,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    minWidth: 50,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
  },
  resetButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  removeCustomButton: {
    width: 28,
    height: 28,
    backgroundColor: Colors.redFaded,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  customNameInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    padding: 4,
  },
  customAddConfirm: {
    width: 40,
    height: 40,
    backgroundColor: Colors.goldFaded,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAddCancel: {
    width: 40,
    height: 40,
    backgroundColor: Colors.background,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
  },
  addCustomButtonText: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    backgroundColor: Colors.gold,
    borderRadius: 12,
  },
  saveButtonText: {
    color: Colors.navy,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  highlightsContainer: {
    gap: 10,
    marginBottom: 32,
  },
  hlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  hlCardIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.goldFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hlCardContent: {
    flex: 1,
  },
  hlCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  hlCardNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  hlRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Colors.redFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hlFormCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.goldFaded,
  },
  hlFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hlFormTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  hlInputGroup: {
    marginBottom: 10,
  },
  hlInputLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  hlInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  hlTextArea: {
    height: 56,
    textAlignVertical: 'top' as const,
  },
  hlSaveBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  hlSaveBtnText: {
    color: Colors.navy,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  addHighlightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed' as const,
  },
  addHighlightButtonText: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  noPlayerState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 14,
  },
  noPlayerIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
    marginBottom: 8,
  },
  noPlayerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  noPlayerSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  noPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
  },
  noPlayerButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.navy,
  },
});
