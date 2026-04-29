import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DAILY_VERSES } from '@/constants/verses';
import { Verse } from '@/types';

const DAILY_VERSE_KEY = 'statflow_daily_verse';

interface StoredDailyVerse {
  date: string;
  verseIndex: number;
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function seededIndex(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % DAILY_VERSES.length;
}

export function useDailyVerse(): Verse | null {
  const [verse, setVerse] = useState<Verse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const today = getTodayString();
        const raw = await AsyncStorage.getItem(DAILY_VERSE_KEY);

        if (raw) {
          const stored: StoredDailyVerse = JSON.parse(raw);
          if (stored.date === today && stored.verseIndex < DAILY_VERSES.length) {
            if (!cancelled) setVerse(DAILY_VERSES[stored.verseIndex]);
            return;
          }
        }

        const index = seededIndex(today);
        const entry: StoredDailyVerse = { date: today, verseIndex: index };
        await AsyncStorage.setItem(DAILY_VERSE_KEY, JSON.stringify(entry));
        if (!cancelled) setVerse(DAILY_VERSES[index]);
      } catch (e) {
        console.log('Error loading daily verse:', e);
        if (!cancelled) setVerse(DAILY_VERSES[0]);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  return verse;
}
