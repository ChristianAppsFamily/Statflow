export type Sport = 'basketball' | 'football' | 'soccer' | 'baseball' | 'volleyball' | 'hockey' | 'golf' | 'tennis' | 'lacrosse' | 'track_and_field' | 'softball' | 'rugby' | 'cricket' | 'boxing' | 'swimming' | 'bowling';

export interface PlayerProfile {
  id: string;
  name: string;
  age?: string;
  grade?: string;
  height?: string;
  jerseyNumber?: string;
  primarySport?: Sport;
  teamName?: string;
  avatarUri?: string;
  createdAt: string;
}

export interface SportConfig {
  name: string;
  icon: string;
  stats: StatField[];
}

export interface StatField {
  key: string;
  label: string;
  shortLabel: string;
}

export type GameOutcome = 'win' | 'loss';

export interface Session {
  id: string;
  sport: Sport;
  date: string;
  opponent?: string;
  notes?: string;
  stats: Record<string, number>;
  outcome?: GameOutcome;
  teamScore?: number;
  opponentScore?: number;
  playerId?: string;
}

export interface Verse {
  reference: string;
  text: string;
}

export interface AppSettings {
  dailyVerseEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface Highlight {
  id: string;
  title: string;
  type: 'link' | 'file';
  url?: string;
  localUri?: string;
  thumbnailUri?: string;
  createdAt: string;
  sport?: Sport;
  notes?: string;
  sessionId?: string;
  playerId?: string;
}
