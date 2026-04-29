import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  UserPlus,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronRight,
  Users,
  Shield,
  Camera,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths, Directory } from 'expo-file-system';
import { usePlayers } from '@/contexts/PlayerContext';
import { useApp } from '@/contexts/AppContext';
import { PlayerProfile, Sport } from '@/types';
import { SPORT_OPTIONS } from '@/constants/sports';
import { Colors } from '@/constants/colors';
import BannerAdComponent from '@/components/BannerAd';

const AVATAR_COLORS = [
  '#D4AF37', '#2ECC71', '#3498DB', '#E74C3C', '#9B59B6',
  '#1ABC9C', '#F39C12', '#E67E22', '#FF6B6B', '#48DBFB',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PlayersScreen() {
  const insets = useSafeAreaInsets();
  const { players, activePlayerId, activePlayer, addPlayer, updatePlayer, deletePlayer, setActivePlayer } = usePlayers();
  const { settings } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerProfile | null>(null);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [grade, setGrade] = useState('');
  const [height, setHeight] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [primarySport, setPrimarySport] = useState<Sport | undefined>(undefined);
  const [teamName, setTeamName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);

  const resetForm = useCallback(() => {
    setName('');
    setAge('');
    setGrade('');
    setHeight('');
    setJerseyNumber('');
    setPrimarySport(undefined);
    setTeamName('');
    setAvatarUri(undefined);
    setEditingPlayer(null);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setModalVisible(true);
  }, [resetForm]);

  const openEditModal = useCallback((player: PlayerProfile) => {
    setEditingPlayer(player);
    setName(player.name);
    setAge(player.age || '');
    setGrade(player.grade || '');
    setHeight(player.height || '');
    setJerseyNumber(player.jerseyNumber || '');
    setPrimarySport(player.primarySport);
    setTeamName(player.teamName || '');
    setAvatarUri(player.avatarUri);
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(() => {
    Keyboard.dismiss();
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a player name.');
      return;
    }

    if (editingPlayer) {
      updatePlayer(editingPlayer.id, {
        name: name.trim(),
        age: age.trim() || undefined,
        grade: grade.trim() || undefined,
        height: height.trim() || undefined,
        jerseyNumber: jerseyNumber.trim() || undefined,
        primarySport: primarySport,
        teamName: teamName.trim() || undefined,
        avatarUri: avatarUri,
      });
    } else {
      const newPlayer: PlayerProfile = {
        id: Date.now().toString(),
        name: name.trim(),
        age: age.trim() || undefined,
        grade: grade.trim() || undefined,
        height: height.trim() || undefined,
        jerseyNumber: jerseyNumber.trim() || undefined,
        primarySport: primarySport,
        teamName: teamName.trim() || undefined,
        avatarUri: avatarUri,
        createdAt: new Date().toISOString(),
      };
      addPlayer(newPlayer);
    }

    if (settings.hapticsEnabled && Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setModalVisible(false);
    resetForm();
  }, [name, age, grade, height, jerseyNumber, primarySport, teamName, avatarUri, editingPlayer, addPlayer, updatePlayer, settings.hapticsEnabled, resetForm]);

  const saveImagePersistently = useCallback(async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      return uri;
    }
    try {
      const avatarsDir = new Directory(Paths.document, 'avatars');
      if (!avatarsDir.exists) {
        avatarsDir.create({ intermediates: true });
      }
      const fileName = `avatar_${Date.now()}.jpg`;
      const destFile = new File(avatarsDir, fileName);
      const sourceFile = new File(uri);
      sourceFile.copy(destFile);
      console.log('[Players] Image saved persistently:', destFile.uri);
      return destFile.uri;
    } catch (error) {
      console.error('[Players] Error saving image persistently:', error);
      return uri;
    }
  }, []);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[Players] Image picked:', result.assets[0].uri);
        const persistentUri = await saveImagePersistently(result.assets[0].uri);
        setAvatarUri(persistentUri);
      }
    } catch (error) {
      console.error('[Players] Image picker error:', error);
      Alert.alert('Error', 'Could not pick image. Please try again.');
    }
  }, [saveImagePersistently]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera permission is required to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[Players] Photo taken:', result.assets[0].uri);
        const persistentUri = await saveImagePersistently(result.assets[0].uri);
        setAvatarUri(persistentUri);
      }
    } catch (error) {
      console.error('[Players] Camera error:', error);
      Alert.alert('Error', 'Could not take photo. Please try again.');
    }
  }, [saveImagePersistently]);

  const handlePickPhoto = useCallback(() => {
    if (Platform.OS === 'web') {
      void pickImage();
      return;
    }
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Photo Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickImage, takePhoto]);

  const handleDelete = useCallback((player: PlayerProfile) => {
    const isActive = player.id === activePlayerId;
    Alert.alert(
      'Delete Player',
      `Are you sure you want to delete ${player.name}?${isActive ? ' This is your active player.' : ''}\n\nThis will not delete their game history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePlayer(player.id);
            if (settings.hapticsEnabled && Platform.OS !== 'web') {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          },
        },
      ]
    );
  }, [activePlayerId, deletePlayer, settings.hapticsEnabled]);

  const handleSelectActive = useCallback((playerId: string) => {
    if (playerId === activePlayerId) return;
    setActivePlayer(playerId);
    if (settings.hapticsEnabled && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [activePlayerId, setActivePlayer, settings.hapticsEnabled]);

  const getSportLabel = (sport?: Sport) => {
    if (!sport) return null;
    const found = SPORT_OPTIONS.find((s) => s.value === sport);
    return found?.label || null;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Players</Text>
            <Text style={styles.headerSubtitle}>
              {players.length === 0
                ? 'Create your first player'
                : `${players.length} player${players.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={openCreateModal}
            testID="add-player-button"
          >
            <UserPlus size={20} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        {activePlayer && (
          <View style={styles.activeBanner}>
            {activePlayer.avatarUri ? (
              <Image source={{ uri: activePlayer.avatarUri }} style={styles.activeBannerPhoto} />
            ) : (
              <View style={[styles.activeBannerAvatar, { backgroundColor: getAvatarColor(activePlayer.id) }]}>
                <Text style={styles.activeBannerInitials}>
                  {getInitials(activePlayer.name)}
                </Text>
              </View>
            )}
            <View style={styles.activeBannerInfo}>
              <Text style={styles.activeBannerLabel}>ACTIVE PLAYER</Text>
              <Text style={styles.activeBannerName}>{activePlayer.name}</Text>
            </View>
            <Shield size={16} color={Colors.gold} />
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {players.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Users size={40} color={Colors.cardBorder} />
            </View>
            <Text style={styles.emptyTitle}>No Players Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a player profile to start tracking stats, game history, and highlights for each player individually.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={openCreateModal}
            >
              <UserPlus size={20} color={Colors.navy} />
              <Text style={styles.emptyButtonText}>Create First Player</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.playerList}>
            {players.map((player) => {
              const isActive = player.id === activePlayerId;
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[styles.playerCard, isActive && styles.playerCardActive]}
                  onPress={() => handleSelectActive(player.id)}
                  activeOpacity={0.7}
                  testID={`player-card-${player.id}`}
                >
                  <View style={styles.playerCardLeft}>
                    {player.avatarUri ? (
                      <View>
                        <Image source={{ uri: player.avatarUri }} style={styles.playerAvatarImage} />
                        {player.jerseyNumber && (
                          <View style={styles.jerseyBadge}>
                            <Text style={styles.jerseyBadgeText}>#{player.jerseyNumber}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={[styles.playerAvatar, { backgroundColor: getAvatarColor(player.id) }]}>
                        <Text style={styles.playerAvatarText}>
                          {getInitials(player.name)}
                        </Text>
                        {player.jerseyNumber && (
                          <View style={styles.jerseyBadge}>
                            <Text style={styles.jerseyBadgeText}>#{player.jerseyNumber}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.playerCardCenter}>
                    <View style={styles.playerNameRow}>
                      <Text style={styles.playerName} numberOfLines={1}>
                        {player.name}
                      </Text>
                      {isActive && (
                        <View style={styles.activeDot} />
                      )}
                    </View>
                    <View style={styles.playerMeta}>
                      {player.primarySport && (
                        <Text style={styles.playerMetaText}>
                          {getSportLabel(player.primarySport)}
                        </Text>
                      )}
                      {player.teamName && (
                        <Text style={styles.playerMetaText} numberOfLines={1}>
                          {player.teamName}
                        </Text>
                      )}
                    </View>
                    <View style={styles.playerDetails}>
                      {player.age && (
                        <Text style={styles.playerDetailChip}>Age {player.age}</Text>
                      )}
                      {player.grade && (
                        <Text style={styles.playerDetailChip}>{player.grade}</Text>
                      )}
                      {player.height && (
                        <Text style={styles.playerDetailChip}>{player.height}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.playerCardRight}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => openEditModal(player)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Edit2 size={16} color={Colors.gold} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleDelete(player)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={16} color={Colors.red} />
                    </TouchableOpacity>
                    <ChevronRight size={16} color={Colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setModalVisible(false); resetForm(); }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingPlayer ? 'Edit Player' : 'New Player'}
            </Text>
            <TouchableOpacity onPress={handleSave} testID="save-player-button">
              <Check size={24} color={Colors.gold} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.photoSection}>
              <TouchableOpacity
                style={styles.photoPickerButton}
                onPress={handlePickPhoto}
                activeOpacity={0.7}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera size={32} color={Colors.gold} />
                    <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {avatarUri && (
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => setAvatarUri(undefined)}
                >
                  <Text style={styles.removePhotoText}>Remove Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>NAME *</Text>
              <TextInput
                style={styles.formInput}
                value={name}
                onChangeText={setName}
                placeholder="Player name"
                placeholderTextColor={Colors.textSecondary}
                autoFocus={!editingPlayer}
                returnKeyType="next"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>AGE</Text>
                <TextInput
                  style={styles.formInput}
                  value={age}
                  onChangeText={setAge}
                  placeholder="e.g. 14"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>GRADE</Text>
                <TextInput
                  style={styles.formInput}
                  value={grade}
                  onChangeText={setGrade}
                  placeholder="e.g. 9th"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>HEIGHT</Text>
                <TextInput
                  style={styles.formInput}
                  value={height}
                  onChangeText={setHeight}
                  placeholder={`e.g. 5'10"`}
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>JERSEY #</Text>
                <TextInput
                  style={styles.formInput}
                  value={jerseyNumber}
                  onChangeText={setJerseyNumber}
                  placeholder="e.g. 23"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>TEAM NAME</Text>
              <TextInput
                style={styles.formInput}
                value={teamName}
                onChangeText={setTeamName}
                placeholder="e.g. Eagles"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>PRIMARY SPORT</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.sportScroll}
              >
                {SPORT_OPTIONS.map((sport) => (
                  <TouchableOpacity
                    key={sport.value}
                    style={[
                      styles.sportChip,
                      primarySport === sport.value && styles.sportChipActive,
                    ]}
                    onPress={() =>
                      setPrimarySport(primarySport === sport.value ? undefined : sport.value)
                    }
                  >
                    <Text
                      style={[
                        styles.sportChipText,
                        primarySport === sport.value && styles.sportChipTextActive,
                      ]}
                    >
                      {sport.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {editingPlayer ? 'Save Changes' : 'Create Player'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      {/* BOTTOM BANNER AD — Players section */}
      <BannerAdComponent position="bottom" />
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
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  activeBannerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBannerInitials: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  activeBannerInfo: {
    flex: 1,
  },
  activeBannerLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.gold,
    letterSpacing: 1,
  },
  activeBannerName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 14,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.navy,
  },
  playerList: {
    gap: 12,
  },
  playerCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  playerCardActive: {
    borderColor: Colors.gold,
    borderWidth: 2,
  },
  playerCardLeft: {},
  playerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#fff',
  },
  jerseyBadge: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    backgroundColor: Colors.navy,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  jerseyBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  playerCardCenter: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
  },
  playerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  playerMetaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  playerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  playerDetailChip: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.gold,
    backgroundColor: Colors.goldFaded,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  playerCardRight: {
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sportScroll: {
    flexDirection: 'row',
  },
  sportChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.card,
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
    fontSize: 13,
    fontWeight: '600' as const,
  },
  sportChipTextActive: {
    color: Colors.navy,
  },
  saveButton: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: Colors.navy,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  activeBannerPhoto: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  playerAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPickerButton: {
    width: 100,
    height: 100,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPlaceholderText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  removePhotoButton: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  removePhotoText: {
    fontSize: 13,
    color: Colors.red,
    fontWeight: '600' as const,
  },
});
