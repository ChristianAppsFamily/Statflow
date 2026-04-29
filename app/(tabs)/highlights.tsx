import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Modal,
  Platform,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video as VideoIcon, Link, Trash2, Plus, X, Play, ExternalLink, Edit2, Save } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { usePlayers } from '@/contexts/PlayerContext';
import { Highlight, Sport } from '@/types';
import { SPORTS_CONFIG } from '@/constants/sports';
import { Colors } from '@/constants/colors';

type AddMode = 'none' | 'link' | 'file';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HighlightsScreen() {
  const { highlights, addHighlight, updateHighlight, deleteHighlight, sessions, settings } = useApp();
  const { activePlayerId } = usePlayers();

  const playerHighlights = React.useMemo(() => {
    if (!activePlayerId) return highlights;
    return highlights.filter((h) => h.playerId === activePlayerId);
  }, [highlights, activePlayerId]);
  const insets = useSafeAreaInsets();
  const [addMode, setAddMode] = useState<AddMode>('none');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSport, setSelectedSport] = useState<Sport | undefined>(undefined);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const videoRef = useRef<Video>(null);

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setNotes('');
    setSelectedSport(undefined);
    setAddMode('none');
  };

  const startEdit = (hl: Highlight) => {
    setEditingId(hl.id);
    setEditTitle(hl.title);
    setEditUrl(hl.url || '');
    setEditNotes(hl.notes || '');
  };

  const cancelEdit = () => {
    Keyboard.dismiss();
    setEditingId(null);
    setEditTitle('');
    setEditUrl('');
    setEditNotes('');
  };

  const saveEdit = () => {
    Keyboard.dismiss();
    if (!editingId) return;
    if (!editTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for this highlight.');
      return;
    }
    const hl = highlights.find((h) => h.id === editingId);
    if (!hl) return;
    if (hl.type === 'link' && !editUrl.trim()) {
      Alert.alert('Missing URL', 'Please enter a video link.');
      return;
    }
    updateHighlight(editingId, {
      title: editTitle.trim(),
      url: hl.type === 'link' ? editUrl.trim() : hl.url,
      notes: editNotes.trim() || undefined,
    });
    if (settings.hapticsEnabled && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    cancelEdit();
  };

  const handleAddLink = () => {
    Keyboard.dismiss();
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for this highlight.');
      return;
    }
    if (!url.trim()) {
      Alert.alert('Missing URL', 'Please enter a video link.');
      return;
    }

    const newHighlight: Highlight = {
      id: Date.now().toString(),
      title: title.trim(),
      type: 'link',
      url: url.trim(),
      createdAt: new Date().toISOString(),
      sport: selectedSport,
      notes: notes.trim() || undefined,
      playerId: activePlayerId || undefined,
    };

    addHighlight(newHighlight);
    if (settings.hapticsEnabled && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    resetForm();
  };

  const handlePickVideo = async () => {
    Keyboard.dismiss();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your media library to upload videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      if (!title.trim()) {
        Alert.alert('Missing Title', 'Please enter a title for this highlight.');
        return;
      }

      const newHighlight: Highlight = {
        id: Date.now().toString(),
        title: title.trim(),
        type: 'file',
        localUri: asset.uri,
        createdAt: new Date().toISOString(),
        sport: selectedSport,
        notes: notes.trim() || undefined,
        playerId: activePlayerId || undefined,
      };

      addHighlight(newHighlight);
      if (settings.hapticsEnabled && Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      resetForm();
    }
  };

  const handleDeleteHighlight = (id: string, highlightTitle: string) => {
    Alert.alert(
      'Delete Highlight',
      `Are you sure you want to delete "${highlightTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteHighlight(id);
            if (settings.hapticsEnabled && Platform.OS !== 'web') {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          },
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
    console.log('[Highlights] Playing video:', uri);
    setPlayingUri(uri);
    setVideoModalVisible(true);
  };

  const handleCloseVideoModal = () => {
    setVideoModalVisible(false);
    setPlayingUri(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };


  const getSessionLabel = (sessionId?: string) => {
    if (!sessionId) return null;
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    const config = SPORTS_CONFIG[session.sport];
    const date = new Date(session.date);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${config.icon} ${dateStr}${session.opponent ? ` vs ${session.opponent}` : ''}`;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Highlights</Text>
        <Text style={styles.headerSubtitle}>Your best moments</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {addMode === 'none' ? (
          <View style={styles.addButtons}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAddMode('link')}
            >
              <Link size={24} color={Colors.gold} />
              <Text style={styles.addButtonText}>Add Video Link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAddMode('file')}
            >
              <VideoIcon size={24} color={Colors.gold} />
              <Text style={styles.addButtonText}>Upload Video</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {addMode === 'link' ? 'Add Video Link' : 'Upload Video'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Game-winning shot"
                placeholderTextColor={Colors.textSecondary}
                returnKeyType="done"
                blurOnSubmit
              />
            </View>

            {addMode === 'link' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Video URL *</Text>
                <TextInput
                  style={styles.input}
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://youtube.com/..."
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="url"
                  autoCapitalize="none"
                  returnKeyType="done"
                  blurOnSubmit
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sport (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportPicker}>
                {Object.entries(SPORTS_CONFIG).map(([key, sport]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.sportChip,
                      selectedSport === key && styles.sportChipActive,
                    ]}
                    onPress={() => setSelectedSport(selectedSport === key ? undefined : (key as Sport))}
                  >
                    <Text
                      style={[
                        styles.sportChipText,
                        selectedSport === key && styles.sportChipTextActive,
                      ]}
                    >
                      {sport.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about this highlight..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
                blurOnSubmit
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={addMode === 'link' ? handleAddLink : handlePickVideo}
            >
              <Plus size={20} color={Colors.navy} />
              <Text style={styles.saveButtonText}>
                {addMode === 'link' ? 'Save Link' : 'Choose Video'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {playerHighlights.length > 0 && (
          <View style={styles.highlightsList}>
            <Text style={styles.sectionTitle}>Your Highlights</Text>
            {playerHighlights.map((highlight) => (
              editingId === highlight.id ? (
                <View key={highlight.id} style={styles.editCard}>
                  <View style={styles.editCardHeader}>
                    <Text style={styles.editCardTitle}>Edit Highlight</Text>
                    <TouchableOpacity onPress={cancelEdit}>
                      <X size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Title *</Text>
                    <TextInput
                      style={styles.input}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="Highlight title"
                      placeholderTextColor={Colors.textSecondary}
                      returnKeyType="done"
                      blurOnSubmit
                    />
                  </View>
                  {highlight.type === 'link' && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Video URL *</Text>
                      <TextInput
                        style={styles.input}
                        value={editUrl}
                        onChangeText={setEditUrl}
                        placeholder="https://..."
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="url"
                        autoCapitalize="none"
                        returnKeyType="done"
                        blurOnSubmit
                      />
                    </View>
                  )}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notes (Optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={editNotes}
                      onChangeText={setEditNotes}
                      placeholder="Notes..."
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                      numberOfLines={2}
                      blurOnSubmit
                      returnKeyType="done"
                    />
                  </View>
                  <View style={styles.editCardActions}>
                    <TouchableOpacity style={styles.editCancelBtn} onPress={cancelEdit}>
                      <Text style={styles.editCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editSaveBtn} onPress={saveEdit}>
                      <Save size={18} color={Colors.navy} />
                      <Text style={styles.editSaveText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View key={highlight.id} style={styles.highlightCard}>
                  <View style={styles.highlightIcon}>
                    {highlight.type === 'link' ? (
                      <Link size={20} color={Colors.gold} />
                    ) : (
                      <VideoIcon size={20} color={Colors.gold} />
                    )}
                  </View>
                  <View style={styles.highlightContent}>
                    <Text style={styles.highlightTitle}>{highlight.title}</Text>
                    <View style={styles.highlightMeta}>
                      <Text style={styles.highlightDate}>{formatDate(highlight.createdAt)}</Text>
                      {highlight.sport && SPORTS_CONFIG[highlight.sport] && (
                        <Text style={styles.sportIcon}>{SPORTS_CONFIG[highlight.sport].icon}</Text>
                      )}
                    </View>

                    {highlight.sessionId && (
                      <Text style={styles.linkedGameText}>
                        {getSessionLabel(highlight.sessionId)}
                      </Text>
                    )}
                    {highlight.notes && (
                      <Text style={styles.highlightNotes} numberOfLines={2}>
                        {highlight.notes}
                      </Text>
                    )}
                  </View>
                  <View style={styles.highlightActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => startEdit(highlight)}
                    >
                      <Edit2 size={18} color={Colors.gold} />
                    </TouchableOpacity>
                    {highlight.type === 'link' && highlight.url && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleOpenLink(highlight.url!)}
                      >
                        <ExternalLink size={18} color={Colors.gold} />
                      </TouchableOpacity>
                    )}
                    {highlight.type === 'file' && highlight.localUri && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handlePlayVideo(highlight.localUri!)}
                      >
                        <Play size={18} color={Colors.gold} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteHighlight(highlight.id, highlight.title)}
                    >
                      <Trash2 size={18} color={Colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            ))}
          </View>
        )}

        {playerHighlights.length === 0 && addMode === 'none' && (
          <View style={styles.emptyState}>
            <VideoIcon size={48} color={Colors.cardBorder} />
            <Text style={styles.emptyTitle}>No Highlights Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add video links or upload your best plays to save them here.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={videoModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseVideoModal}
      >
        <View style={styles.videoModalContainer}>
          <View style={[styles.videoModalHeader, { paddingTop: insets.top + 8 }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  addButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  addButton: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  addButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 16,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sportPicker: {
    flexDirection: 'row',
  },
  sportChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.inputBg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sportChipActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  sportChipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sportChipTextActive: {
    color: Colors.navy,
  },
  saveButton: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    color: Colors.navy,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  highlightsList: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  highlightCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  highlightIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.goldFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightContent: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  highlightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  highlightDate: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  sportIcon: {
    fontSize: 16,
  },
  linkedGameText: {
    fontSize: 12,
    color: Colors.gold,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  highlightNotes: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  highlightUrlPreview: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  highlightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  editCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  editCardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  editCancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  editSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editSaveText: {
    color: Colors.navy,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
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
