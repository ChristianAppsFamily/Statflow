import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { AppSettings, Highlight, PlayerProfile, Session } from '@/types';

const SESSIONS_KEY = 'statflow_sessions';
const SETTINGS_KEY = 'statflow_settings';
const HIGHLIGHTS_KEY = 'statflow_highlights';
const PLAYERS_KEY = 'statflow_players';
const ACTIVE_PLAYER_KEY = 'statflow_active_player';

const BACKUP_VERSION = 1;

const defaultSettings: AppSettings = {
  dailyVerseEnabled: true,
  hapticsEnabled: true,
};

export type BackupPayload = {
  version: number;
  exportedAt: string;
  data: {
    sessions: Session[];
    settings: AppSettings;
    highlights: Highlight[];
    players: PlayerProfile[];
    activePlayerId: string | null;
  };
};

export type ImportBackupResult = {
  sessionCount: number;
  playerCount: number;
  highlightCount: number;
};

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

function parseJsonArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function parseSettings(raw: string | null): AppSettings {
  if (!raw) return { ...defaultSettings };
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      dailyVerseEnabled:
        typeof parsed.dailyVerseEnabled === 'boolean'
          ? parsed.dailyVerseEnabled
          : defaultSettings.dailyVerseEnabled,
      hapticsEnabled:
        typeof parsed.hapticsEnabled === 'boolean'
          ? parsed.hapticsEnabled
          : defaultSettings.hapticsEnabled,
    };
  } catch {
    return { ...defaultSettings };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateBackup(parsed: unknown): BackupPayload {
  if (!isRecord(parsed)) {
    throw new BackupError('This file is not a valid StatFlow backup.');
  }

  if (parsed.version !== BACKUP_VERSION) {
    throw new BackupError('This backup file is not supported by this version of StatFlow.');
  }

  if (!isRecord(parsed.data)) {
    throw new BackupError('This backup file is missing data.');
  }

  const { sessions, settings, highlights, players, activePlayerId } = parsed.data;

  if (!Array.isArray(sessions) || !Array.isArray(highlights) || !Array.isArray(players)) {
    throw new BackupError('This backup file has an invalid shape.');
  }

  if (!isRecord(settings)) {
    throw new BackupError('This backup file has invalid settings.');
  }

  if (
    activePlayerId !== null &&
    activePlayerId !== undefined &&
    typeof activePlayerId !== 'string'
  ) {
    throw new BackupError('This backup file has an invalid active player.');
  }

  return {
    version: BACKUP_VERSION,
    exportedAt:
      typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    data: {
      sessions: sessions as Session[],
      settings: {
        dailyVerseEnabled:
          typeof settings.dailyVerseEnabled === 'boolean'
            ? settings.dailyVerseEnabled
            : defaultSettings.dailyVerseEnabled,
        hapticsEnabled:
          typeof settings.hapticsEnabled === 'boolean'
            ? settings.hapticsEnabled
            : defaultSettings.hapticsEnabled,
      },
      highlights: highlights as Highlight[],
      players: players as PlayerProfile[],
      activePlayerId:
        typeof activePlayerId === 'string' ? activePlayerId : null,
    },
  };
}

function backupFileName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `StatFlow-Backup-${date}.json`;
}

export async function exportBackup(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new BackupError('Backup export is available in the iOS and Android apps.');
  }

  const [sessionsRaw, settingsRaw, highlightsRaw, playersRaw, activePlayerRaw] =
    await AsyncStorage.multiGet([
      SESSIONS_KEY,
      SETTINGS_KEY,
      HIGHLIGHTS_KEY,
      PLAYERS_KEY,
      ACTIVE_PLAYER_KEY,
    ]);

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      sessions: parseJsonArray<Session>(sessionsRaw[1]),
      settings: parseSettings(settingsRaw[1]),
      highlights: parseJsonArray<Highlight>(highlightsRaw[1]),
      players: parseJsonArray<PlayerProfile>(playersRaw[1]),
      activePlayerId: activePlayerRaw[1] ?? null,
    },
  };

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new BackupError('Sharing is not available on this device.');
  }

  const file = new File(Paths.cache, backupFileName());
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(JSON.stringify(payload, null, 2));

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Save StatFlow Backup',
  });
}

export async function importBackup(): Promise<ImportBackupResult | null> {
  if (Platform.OS === 'web') {
    throw new BackupError('Backup import is available in the iOS and Android apps.');
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'public.json'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  const asset = result.assets[0];
  let text: string;
  try {
    text = await new File(asset.uri).text();
  } catch {
    throw new BackupError('Could not read the selected file.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError('This file is not valid JSON.');
  }

  const backup = validateBackup(parsed);
  const { sessions, settings, highlights, players, activePlayerId } = backup.data;

  const pairs: [string, string][] = [
    [SESSIONS_KEY, JSON.stringify(sessions)],
    [SETTINGS_KEY, JSON.stringify(settings)],
    [HIGHLIGHTS_KEY, JSON.stringify(highlights)],
    [PLAYERS_KEY, JSON.stringify(players)],
  ];

  if (activePlayerId) {
    pairs.push([ACTIVE_PLAYER_KEY, activePlayerId]);
  }

  await AsyncStorage.multiSet(pairs);

  if (!activePlayerId) {
    await AsyncStorage.removeItem(ACTIVE_PLAYER_KEY);
  }

  return {
    sessionCount: sessions.length,
    playerCount: players.length,
    highlightCount: highlights.length,
  };
}
