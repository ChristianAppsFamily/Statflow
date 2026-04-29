import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Share,
  Modal,
  Dimensions,
  Linking,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Edit2, Trash2, Save, X, Share2, Copy, Video as VideoIcon, Link, Plus, Play, ExternalLink, Star } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { usePlayers } from '@/contexts/PlayerContext';
import { SPORTS_CONFIG } from '@/constants/sports';
import { Session, Highlight } from '@/types';
import { Colors } from '@/constants/colors';

type HighlightAddMode = 'none' | 'link' | 'file';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { sessions, updateSession, deleteSession, highlights, addHighlight, updateHighlight, deleteHighlight, settings } = useApp();
  const { activePlayerId, players } = usePlayers();

  const session = sessions.find((s) => s.id === sessionId);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSession, setEditedSession] = useState<Session | null>(null);
  const [highlightAddMode, setHighlightAddMode] = useState<HighlightAddMode>('none');
  const [hlTitle, setHlTitle] = useState('');
  const [hlUrl, setHlUrl] = useState('');
  const [hlNotes, setHlNotes] = useState('');
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null);
  const [editHlTitle, setEditHlTitle] = useState('');
  const [editHlUrl, setEditHlUrl] = useState('');
  const [editHlNotes, setEditHlNotes] = useState('');
  const videoRef = useRef<Video>(null);

  const gameHighlights = useMemo(() => {
    if (!sessionId) return [];
    return highlights.filter((h) => h.sessionId === sessionId);
  }, [highlights, sessionId]);

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Game not found</Text>
      </View>
    );
  }

  const sportConfig = SPORTS_CONFIG[session.sport];

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleEdit = () => {
    setEditedSession({ ...session });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editedSession) {
      updateSession(session.id, editedSession);
      if (settings.hapticsEnabled && Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedSession(null);
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Delete this game? This cannot be undone.');
      if (confirmed) {
        deleteSession(session.id);
        router.back();
      }
    } else {
      Alert.alert(
        'Delete Game',
        'Are you sure you want to delete this game? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteSession(session.id);
              router.back();
            },
          },
        ]
      );
    }
  };

  const updateEditedStat = (key: string, value: string) => {
    if (!editedSession) return;
    const numValue = parseInt(value, 10) || 0;
    setEditedSession({
      ...editedSession,
      stats: { ...editedSession.stats, [key]: Math.max(0, numValue) },
    });
  };

  const currentSession = isEditing && editedSession ? editedSession : session;

  const getPlayerName = () => {
    const pid = session.playerId || activePlayerId;
    if (!pid) return null;
    const player = players.find((p) => p.id === pid);
    return player?.name || null;
  };

  const buildShareText = () => {
    const lines: string[] = [];
    const playerName = getPlayerName();
    lines.push(`${sportConfig.icon} ${sportConfig.name} Game`);
    if (playerName) {
      lines.push(`🏅 Player: ${playerName}`);
    }
    lines.push(`🏟️ Sport: ${sportConfig.name}`);
    lines.push(`📅 ${formatDate(session.date)}`);
    if (session.opponent) {
      lines.push(`🆚 ${session.opponent}`);
    }
    if (session.outcome) {
      lines.push(`🏆 Result: ${session.outcome === 'win' ? 'WIN' : 'LOSS'}`);
    }
    if (session.teamScore !== undefined || session.opponentScore !== undefined) {
      lines.push(`📊 Score: ${session.teamScore ?? 0} - ${session.opponentScore ?? 0}`);
    }
    lines.push('');
    lines.push('── Stats ──');
    const configStats = sportConfig.stats.map((stat) => ({
      key: stat.key,
      shortLabel: stat.shortLabel,
    }));
    const configKeys = new Set(configStats.map((s) => s.key));
    const customStats = Object.keys(session.stats)
      .filter((key) => !configKeys.has(key))
      .map((key) => {
        const cleanLabel = key.startsWith('custom_')
          ? key.replace(/^custom_/, '').replace(/_\d+$/, '').replace(/_/g, ' ')
          : key;
        return { key, shortLabel: cleanLabel.toUpperCase().slice(0, 4) };
      });
    const shareStats = [...configStats, ...customStats];
    shareStats.forEach((stat) => {
      const val = session.stats[stat.key] ?? 0;
      if (val > 0) {
        lines.push(`${stat.shortLabel}: ${val}`);
      }
    });
    lines.push('');
    lines.push('Tracked with StatFlow 📈 #StatFlow #GameDay #MyStats');
    return lines.join('\n');
  };

  const handleShare = async () => {
    if (settings.hapticsEnabled && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const message = buildShareText();
    try {
      await Share.share({ message });
    } catch (error) {
      console.log('[Share] Error sharing:', error);
    }
  };

  const handleCopyStats = async () => {
    if (settings.hapticsEnabled && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const message = buildShareText();
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(message);
      } else {
        const Clipboard = await import('expo-clipboard');
        await Clipboard.setStringAsync(message);
      }
      Alert.alert('Copied!', 'Stats copied to clipboard.');
    } catch (error) {
      console.log('[Clipboard] Error copying:', error);
    }
  };

  const resetHighlightForm = () => {
    setHlTitle('');
    setHlUrl('');
    setHlNotes('');
    setHighlightAddMode('none');
  };

  const handleAddHighlightLink = () => {
    Keyboard.dismiss();
    if (!hlTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for this highlight.');
      return;
    }
    if (!hlUrl.trim()) {
      Alert.alert('Missing URL', 'Please enter a video link.');
      return;
    }

    const newHighlight: Highlight = {
      id: Date.now().toString(),
      title: hlTitle.trim(),
      type: 'link',
      url: hlUrl.trim(),
      createdAt: new Date().toISOString(),
      sport: session.sport,
      notes: hlNotes.trim() || undefined,
      sessionId: session.id,
      playerId: session.playerId || activePlayerId || undefined,
    };

    addHighlight(newHighlight);
    if (settings.hapticsEnabled && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    resetHighlightForm();
  };

  const startEditHighlight = (hl: Highlight) => {
    setEditingHighlightId(hl.id);
    setEditHlTitle(hl.title);
    setEditHlUrl(hl.url || '');
    setEditHlNotes(hl.notes || '');
  };

  const cancelEditHighlight = () => {
    Keyboard.dismiss();
    setEditingHighlightId(null);
    setEditHlTitle('');
    setEditHlUrl('');
    setEditHlNotes('');
  };

  const saveEditHighlight = () => {
    Keyboard.dismiss();
    if (!editingHighlightId) return;
    if (!editHlTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for this highlight.');
      return;
    }
    const hl = gameHighlights.find((h) => h.id === editingHighlightId);
    if (!hl) return;
    if (hl.type === 'link' && !editHlUrl.trim()) {
      Alert.alert('Missing URL', 'Please enter a video link.');
      return;
    }
    updateHighlight(editingHighlightId, {
      title: editHlTitle.trim(),
      url: hl.type === 'link' ? editHlUrl.trim() : hl.url,
      notes: editHlNotes.trim() || undefined,
    });
    if (settings.hapticsEnabled && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    cancelEditHighlight();
  };

  const handlePickHighlightVideo = async () => {
    Keyboard.dismiss();
    if (!hlTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a title before choosing a video.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your media library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newHighlight: Highlight = {
        id: Date.now().toString(),
        title: hlTitle.trim(),
        type: 'file',
        localUri: asset.uri,
        createdAt: new Date().toISOString(),
        sport: session.sport,
        notes: hlNotes.trim() || undefined,
        sessionId: session.id,
        playerId: session.playerId || activePlayerId || undefined,
      };

      addHighlight(newHighlight);
      if (settings.hapticsEnabled && Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      resetHighlightForm();
    }
  };

  const handleDeleteGameHighlight = (id: string, highlightTitle: string) => {
    Alert.alert(
      'Delete Highlight',
      `Remove "${highlightTitle}" from this game?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteHighlight(id),
        },
      ]
    );
  };

  const handleOpenLink = async (link: string) => {
    try {
      const canOpen = await Linking.canOpenURL(link);
      if (canOpen) {
        await Linking.openURL(link);
      } else {
        Alert.alert('Cannot Open', 'Unable to open this link.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open the link.');
    }
  };

  const handlePlayVideo = (uri: string) => {
    console.log('[GameDetail] Playing video:', uri);
    setPlayingUri(uri);
    setVideoModalVisible(true);
  };

  const handleCloseVideoModal = () => {
    setVideoModalVisible(false);
    setPlayingUri(null);
  };

  const allStats = useMemo(() => {
    const configStats = sportConfig.stats.map((stat) => ({
      key: stat.key,
      label: stat.label,
      shortLabel: stat.shortLabel,
    }));
    const configKeys = new Set(configStats.map((s) => s.key));
    const customStats = Object.keys(currentSession.stats)
      .filter((key) => !configKeys.has(key))
      .map((key) => {
        const cleanLabel = key.startsWith('custom_')
          ? key.replace(/^custom_/, '').replace(/_\d+$/, '').replace(/_/g, ' ')
          : key;
        return {
          key,
          label: cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1),
          shortLabel: cleanLabel.toUpperCase().slice(0, 4),
        };
      });
    return [...configStats, ...customStats];
  }, [sportConfig.stats, currentSession.stats]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.sportTitle}>
          {sportConfig.icon} {sportConfig.name}
        </Text>
        <Text style={styles.date}>{formatDate(session.date)}</Text>
        {(currentSession.outcome || currentSession.teamScore !== undefined) && (
          <View style={styles.gameResultRow}>
            {currentSession.outcome && (
              <View
                style={[
                  styles.outcomeBadgeLarge,
                  currentSession.outcome === 'win'
                    ? styles.outcomeBadgeWin
                    : styles.outcomeBadgeLoss,
                ]}
              >
                <Text style={styles.outcomeBadgeTextLarge}>
                  {currentSession.outcome === 'win' ? 'WIN' : 'LOSS'}
                </Text>
              </View>
            )}
            {(currentSession.teamScore !== undefined || currentSession.opponentScore !== undefined) && (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>
                  {currentSession.teamScore ?? 0} - {currentSession.opponentScore ?? 0}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {currentSession.opponent && (
        <View style={styles.opponentCard}>
          <Text style={styles.opponentLabel}>OPPONENT</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editedSession?.opponent || ''}
              onChangeText={(text) =>
                setEditedSession((prev) =>
                  prev ? { ...prev, opponent: text } : null
                )
              }
              placeholder="Opponent"
              placeholderTextColor={Colors.textSecondary}
            />
          ) : (
            <Text style={styles.opponentText}>{currentSession.opponent}</Text>
          )}
        </View>
      )}

      {isEditing && (
        <View style={styles.gameResultEditSection}>
          <Text style={styles.sectionLabel}>GAME RESULT</Text>
          <View style={styles.outcomeEditRow}>
            <TouchableOpacity
              style={[
                styles.outcomeEditButton,
                editedSession?.outcome === 'win' && styles.outcomeEditButtonWin,
              ]}
              onPress={() =>
                setEditedSession((prev) =>
                  prev ? { ...prev, outcome: prev.outcome === 'win' ? undefined : 'win' } : null
                )
              }
            >
              <Text
                style={[
                  styles.outcomeEditButtonText,
                  editedSession?.outcome === 'win' && styles.outcomeEditButtonTextActive,
                ]}
              >
                W
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.outcomeEditButton,
                editedSession?.outcome === 'loss' && styles.outcomeEditButtonLoss,
              ]}
              onPress={() =>
                setEditedSession((prev) =>
                  prev ? { ...prev, outcome: prev.outcome === 'loss' ? undefined : 'loss' } : null
                )
              }
            >
              <Text
                style={[
                  styles.outcomeEditButtonText,
                  editedSession?.outcome === 'loss' && styles.outcomeEditButtonTextActive,
                ]}
              >
                L
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.scoreEditRow}>
            <View style={styles.scoreEditGroup}>
              <Text style={styles.scoreEditLabel}>YOUR SCORE</Text>
              <TextInput
                style={styles.scoreEditInput}
                value={String(editedSession?.teamScore ?? '')}
                onChangeText={(text) =>
                  setEditedSession((prev) =>
                    prev
                      ? { ...prev, teamScore: text ? parseInt(text.replace(/[^0-9]/g, ''), 10) : undefined }
                      : null
                  )
                }
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="number-pad"
              />
            </View>
            <Text style={styles.scoreEditDivider}>-</Text>
            <View style={styles.scoreEditGroup}>
              <Text style={styles.scoreEditLabel}>OPP SCORE</Text>
              <TextInput
                style={styles.scoreEditInput}
                value={String(editedSession?.opponentScore ?? '')}
                onChangeText={(text) =>
                  setEditedSession((prev) =>
                    prev
                      ? { ...prev, opponentScore: text ? parseInt(text.replace(/[^0-9]/g, ''), 10) : undefined }
                      : null
                  )
                }
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>
      )}

      {currentSession.notes && (
        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>NOTES</Text>
          {isEditing ? (
            <TextInput
              style={[styles.editInput, styles.textArea]}
              value={editedSession?.notes || ''}
              onChangeText={(text) =>
                setEditedSession((prev) => (prev ? { ...prev, notes: text } : null))
              }
              placeholder="Notes"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.notesText}>{currentSession.notes}</Text>
          )}
        </View>
      )}

      <Text style={styles.statsTitle}>STATS</Text>
      <View style={styles.statsGrid}>
        {allStats.map((stat) => (
          <View key={stat.key} style={styles.statCard}>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">{stat.shortLabel}</Text>
            {isEditing ? (
              <TextInput
                style={styles.statEditInput}
                value={String(editedSession?.stats[stat.key] ?? 0)}
                onChangeText={(text) => updateEditedStat(stat.key, text)}
                keyboardType="number-pad"
                selectTextOnFocus
              />
            ) : (
              <Text style={styles.statValue}>
                {currentSession.stats[stat.key] ?? 0}
              </Text>
            )}
            <Text style={styles.statName} numberOfLines={1} ellipsizeMode="tail">{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.highlightsSection}>
        <View style={styles.highlightsSectionHeader}>
          <View style={styles.highlightsTitleRow}>
            <Star size={16} color={Colors.gold} />
            <Text style={styles.highlightsSectionTitle}>GAME HIGHLIGHTS</Text>
          </View>
          {highlightAddMode === 'none' && (
            <View style={styles.highlightAddButtons}>
              <TouchableOpacity
                style={styles.hlAddBtn}
                onPress={() => setHighlightAddMode('link')}
              >
                <Link size={14} color={Colors.gold} />
                <Text style={styles.hlAddBtnText}>Link</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.hlAddBtn}
                onPress={() => setHighlightAddMode('file')}
              >
                <VideoIcon size={14} color={Colors.gold} />
                <Text style={styles.hlAddBtnText}>Video</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {highlightAddMode !== 'none' && (
          <View style={styles.hlFormCard}>
            <View style={styles.hlFormHeader}>
              <Text style={styles.hlFormTitle}>
                {highlightAddMode === 'link' ? 'Add Video Link' : 'Upload Video'}
              </Text>
              <TouchableOpacity onPress={resetHighlightForm}>
                <X size={20} color={Colors.textSecondary} />
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
            {highlightAddMode === 'link' && (
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
            )}
            <View style={styles.hlInputGroup}>
              <Text style={styles.hlInputLabel}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[styles.hlInput, styles.hlTextArea]}
                value={hlNotes}
                onChangeText={setHlNotes}
                placeholder="Add any notes..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={2}
                blurOnSubmit
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity
              style={styles.hlSaveBtn}
              onPress={highlightAddMode === 'link' ? handleAddHighlightLink : handlePickHighlightVideo}
            >
              <Plus size={18} color={Colors.navy} />
              <Text style={styles.hlSaveBtnText}>
                {highlightAddMode === 'link' ? 'Save Link' : 'Choose Video'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {gameHighlights.length > 0 ? (
          <View style={styles.hlList}>
            {gameHighlights.map((hl) => (
              editingHighlightId === hl.id ? (
                <View key={hl.id} style={styles.hlEditCard}>
                  <View style={styles.hlEditHeader}>
                    <Text style={styles.hlEditHeaderTitle}>Edit Highlight</Text>
                    <TouchableOpacity onPress={cancelEditHighlight}>
                      <X size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.hlInputGroup}>
                    <Text style={styles.hlInputLabel}>TITLE</Text>
                    <TextInput
                      style={styles.hlInput}
                      value={editHlTitle}
                      onChangeText={setEditHlTitle}
                      placeholder="Highlight title"
                      placeholderTextColor={Colors.textSecondary}
                      returnKeyType="done"
                      blurOnSubmit
                    />
                  </View>
                  {hl.type === 'link' && (
                    <View style={styles.hlInputGroup}>
                      <Text style={styles.hlInputLabel}>VIDEO URL</Text>
                      <TextInput
                        style={styles.hlInput}
                        value={editHlUrl}
                        onChangeText={setEditHlUrl}
                        placeholder="https://..."
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="url"
                        autoCapitalize="none"
                        returnKeyType="done"
                        blurOnSubmit
                      />
                    </View>
                  )}
                  <View style={styles.hlInputGroup}>
                    <Text style={styles.hlInputLabel}>NOTES (OPTIONAL)</Text>
                    <TextInput
                      style={[styles.hlInput, styles.hlTextArea]}
                      value={editHlNotes}
                      onChangeText={setEditHlNotes}
                      placeholder="Notes..."
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                      numberOfLines={2}
                      blurOnSubmit
                      returnKeyType="done"
                    />
                  </View>
                  <View style={styles.hlEditActions}>
                    <TouchableOpacity style={styles.hlEditCancelBtn} onPress={cancelEditHighlight}>
                      <Text style={styles.hlEditCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.hlSaveBtn} onPress={saveEditHighlight}>
                      <Save size={16} color={Colors.navy} />
                      <Text style={styles.hlSaveBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View key={hl.id} style={styles.hlCard}>
                  <View style={styles.hlIcon}>
                    {hl.type === 'link' ? (
                      <Link size={16} color={Colors.gold} />
                    ) : (
                      <VideoIcon size={16} color={Colors.gold} />
                    )}
                  </View>
                  <View style={styles.hlContent}>
                    <Text style={styles.hlTitle}>{hl.title}</Text>

                    {hl.notes && (
                      <Text style={styles.hlNotes} numberOfLines={1}>{hl.notes}</Text>
                    )}
                  </View>
                  <View style={styles.hlActions}>
                    <TouchableOpacity
                      style={styles.hlActionBtn}
                      onPress={() => startEditHighlight(hl)}
                    >
                      <Edit2 size={16} color={Colors.gold} />
                    </TouchableOpacity>
                    {hl.type === 'link' && hl.url && (
                      <TouchableOpacity
                        style={styles.hlActionBtn}
                        onPress={() => handleOpenLink(hl.url!)}
                      >
                        <ExternalLink size={16} color={Colors.gold} />
                      </TouchableOpacity>
                    )}
                    {hl.type === 'file' && hl.localUri && (
                      <TouchableOpacity
                        style={styles.hlActionBtn}
                        onPress={() => handlePlayVideo(hl.localUri!)}
                      >
                        <Play size={16} color={Colors.gold} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.hlActionBtn}
                      onPress={() => handleDeleteGameHighlight(hl.id, hl.title)}
                    >
                      <Trash2 size={16} color={Colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            ))}
          </View>
        ) : highlightAddMode === 'none' ? (
          <View style={styles.hlEmpty}>
            <Text style={styles.hlEmptyText}>No highlights for this game yet</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.shareSection}>
        <Text style={styles.shareSectionTitle}>SHARE YOUR GAME</Text>
        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Share2 size={20} color={Colors.navy} />
            <Text style={styles.shareButtonText}>Share Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyStats}>
            <Copy size={18} color={Colors.gold} />
            <Text style={styles.copyButtonText}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actions}>
        {isEditing ? (
          <>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <X size={20} color={Colors.textSecondary} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Save size={20} color={Colors.navy} />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Trash2 size={20} color={Colors.red} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Edit2 size={20} color={Colors.navy} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal
        visible={videoModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseVideoModal}
      >
        <View style={styles.videoModalContainer}>
          <View style={styles.videoModalHeader}>
            <TouchableOpacity style={styles.videoCloseButton} onPress={handleCloseVideoModal}>
              <X size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.videoModalTitle}>Playing Highlight</Text>
            <View style={{ width: 40 }} />
          </View>
          {playingUri && (
            <View style={styles.videoWrapper}>
              <Video
                ref={videoRef}
                source={{ uri: playingUri }}
                style={styles.videoPlayer}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping={false}
                onError={(error) => {
                  console.log('[Video] Playback error:', error);
                  Alert.alert('Playback Error', 'Unable to play this video. The file may have been moved or deleted.');
                  handleCloseVideoModal();
                }}
              />
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  sportTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  date: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  gameResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  outcomeBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  outcomeBadgeWin: {
    backgroundColor: '#065f46',
  },
  outcomeBadgeLoss: {
    backgroundColor: '#7f1d1d',
  },
  outcomeBadgeTextLarge: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  scoreBadge: {
    backgroundColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scoreBadgeText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  gameResultEditSection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  outcomeEditRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  outcomeEditButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.cardBorder,
  },
  outcomeEditButtonWin: {
    backgroundColor: '#065f46',
    borderColor: Colors.green,
  },
  outcomeEditButtonLoss: {
    backgroundColor: '#7f1d1d',
    borderColor: Colors.red,
  },
  outcomeEditButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  outcomeEditButtonTextActive: {
    color: Colors.textPrimary,
  },
  scoreEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreEditGroup: {
    flex: 1,
    gap: 6,
  },
  scoreEditLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  scoreEditInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  scoreEditDivider: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginTop: 18,
  },
  opponentCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.gold,
  },
  opponentLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  opponentText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  notesCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 15,
    color: '#d1d5db',
    lineHeight: 22,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    width: '31%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden' as const,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    width: '100%',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  statName: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    width: '100%',
  },
  highlightsSection: {
    marginBottom: 28,
  },
  highlightsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  highlightsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightsSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 1.5,
  },
  highlightAddButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  hlAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  hlAddBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  hlFormCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.goldFaded,
  },
  hlFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  hlFormTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  hlInputGroup: {
    marginBottom: 12,
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
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  hlTextArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  hlSaveBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  hlSaveBtnText: {
    color: Colors.navy,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  hlList: {
    gap: 10,
  },
  hlCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  hlIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.goldFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hlContent: {
    flex: 1,
  },
  hlTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  hlNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  hlActions: {
    flexDirection: 'row',
    gap: 6,
  },
  hlActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hlEditCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  hlEditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hlEditHeaderTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  hlEditActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  hlEditCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  hlEditCancelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  hlUrlPreview: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  hlEmpty: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
  },
  hlEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  shareSection: {
    marginBottom: 24,
  },
  shareSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    backgroundColor: Colors.gold,
    borderRadius: 12,
  },
  shareButtonText: {
    color: Colors.navy,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  copyButtonText: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  editButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    backgroundColor: Colors.gold,
    borderRadius: 12,
  },
  editButtonText: {
    color: Colors.navy,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.red,
  },
  deleteButtonText: {
    color: Colors.red,
    fontSize: 16,
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
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  editInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statEditInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 8,
    color: Colors.gold,
    fontSize: 28,
    fontWeight: '700' as const,
    textAlign: 'center',
    minWidth: 60,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  videoCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoModalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  videoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (9 / 16),
  },
});
