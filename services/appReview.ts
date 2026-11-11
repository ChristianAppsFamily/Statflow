import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWriteReviewUrl } from '@/constants/review';
import {
  Alert,
  InteractionManager,
  Linking,
  Platform,
} from 'react-native';

export const REVIEW_COMPLETED_KEY = 'statflow_review_completed';
const STAT_SAVED_LIFETIME_KEY = 'statflow_stats_saved_lifetime';

const STAT_INTERVAL = 4;
const PROMPT_DELAY_MS = 1500;

function log(...args: unknown[]) {
  if (__DEV__) console.log(...args);
}

/**
 * Call after each saved game/stat session.
 * Prompts on the 4th save, then every 4th (8, 12, 16…) until the user rates.
 */
export async function checkReviewPromptAfterStatSaved(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const completed = await AsyncStorage.getItem(REVIEW_COMPLETED_KEY);
    if (completed === 'true') return;

    const raw = await AsyncStorage.getItem(STAT_SAVED_LIFETIME_KEY);
    let count = raw ? parseInt(raw, 10) : 0;
    if (Number.isNaN(count)) count = 0;

    count += 1;
    await AsyncStorage.setItem(STAT_SAVED_LIFETIME_KEY, count.toString());
    log('[AppReview] Lifetime stats saved:', count);

    if (count < STAT_INTERVAL || count % STAT_INTERVAL !== 0) return;

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        void showRateAppAlert(count);
      }, PROMPT_DELAY_MS);
    });
  } catch (e) {
    log('[AppReview] Error checking stat save count:', e);
  }
}

async function showRateAppAlert(statCount: number): Promise<void> {
  try {
    const completed = await AsyncStorage.getItem(REVIEW_COMPLETED_KEY);
    if (completed === 'true') return;

    log('[AppReview] Showing rate prompt after stat save #', statCount);

    Alert.alert(
      'Enjoying StatFlow?',
      'A quick App Store rating helps us keep StatFlow free for student athletes.',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Rate StatFlow',
          onPress: () => void openAppStoreReview(),
        },
      ],
      { cancelable: true }
    );
  } catch (e) {
    log('[AppReview] Error showing review prompt:', e);
  }
}

/** Opens the App Store / Play Store write-review page (Settings or prompt). */
export async function openAppStoreReview(): Promise<void> {
  try {
    const reviewUrl = getWriteReviewUrl();

    if (!reviewUrl) {
      log('[AppReview] No ios.appStoreUrl in app.json');
      Alert.alert(
        'Thank you!',
        'Please search for StatFlow in the App Store to leave a rating.'
      );
      return;
    }

    const canOpen = await Linking.canOpenURL(reviewUrl);
    if (!canOpen) {
      log('[AppReview] Cannot open store URL:', reviewUrl);
      Alert.alert(
        'Unable to open App Store',
        'Please search for StatFlow in the App Store to leave a rating.'
      );
      return;
    }

    await Linking.openURL(reviewUrl);
    await AsyncStorage.setItem(REVIEW_COMPLETED_KEY, 'true');
    log('[AppReview] Marked review flow as completed');
  } catch (e) {
    log('[AppReview] Failed to open store for review:', e);
  }
}
