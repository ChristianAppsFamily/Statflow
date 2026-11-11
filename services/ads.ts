import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getTrackingStatus } from '@/services/tracking';
import { getAdUnitId } from '@/constants/ads';

let adsInitialized = false;
let trackingGranted = false;
let isAdFreeUser = false;
let InterstitialAd: any = null;
let AdEventType: any = null;
let interstitialAd: any = null;
let interstitialLoaded = false;
let interstitialUnsubscribers: Array<() => void> = [];
let lastInterstitialTime = 0;
const INTERSTITIAL_COOLDOWN_MS = 60000;

function log(...args: unknown[]) {
  if (__DEV__) console.log(...args);
}

/** Keep interstitial gating in sync with SubscriptionContext entitlement. */
export function setAdFreeEntitlement(adFree: boolean): void {
  isAdFreeUser = adFree;
}

function clearInterstitialListeners(): void {
  for (const unsub of interstitialUnsubscribers) {
    try {
      unsub();
    } catch {
      // ignore
    }
  }
  interstitialUnsubscribers = [];
}

/**
 * Initialize AdMob. ATT is handled by ATTPermissionScreen on iOS; only read status here.
 */
export async function initializeAds(): Promise<void> {
  if (Platform.OS === 'web') {
    log('[Ads] AdMob not supported on web');
    return;
  }

  if (adsInitialized) {
    log('[Ads] Already initialized');
    return;
  }

  try {
    trackingGranted = (await getTrackingStatus()) === 'granted';
    log('[Ads] Tracking granted:', trackingGranted);

    try {
      const gma = require('react-native-google-mobile-ads');
      const mobileAdsFactory = gma.MobileAds ?? gma.default;
      InterstitialAd = gma.InterstitialAd;
      AdEventType = gma.AdEventType;

      if (typeof mobileAdsFactory !== 'function') {
        log('[Ads] MobileAds export is not callable');
        return;
      }
      if (typeof InterstitialAd?.createForAdRequest !== 'function') {
        log('[Ads] InterstitialAd.createForAdRequest is not callable');
        return;
      }

      const instance = mobileAdsFactory();

      if (typeof instance?.setRequestConfiguration !== 'function' || typeof instance?.initialize !== 'function') {
        log('[Ads] MobileAds instance methods unavailable');
        return;
      }

      await instance.setRequestConfiguration({
        maxAdContentRating: 'G',
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : undefined,
      });

      await instance.initialize();
      adsInitialized = true;
      log('[Ads] Initialized successfully');

      void loadInterstitialAd();
    } catch (importErr: any) {
      log('[Ads] SDK unavailable (Expo Go / not installed):', importErr?.message);
      return;
    }
  } catch (e: any) {
    log('[Ads] Init failed:', e?.message || e);
    adsInitialized = false;
  }
}

async function loadInterstitialAd(): Promise<void> {
  if (!adsInitialized || !InterstitialAd || !AdEventType || isAdFreeUser) return;

  try {
    const adUnitId = getAdUnitId('interstitial');
    if (!adUnitId) return;

    clearInterstitialListeners();
    interstitialLoaded = false;

    log('[Ads] Loading interstitial...', adUnitId);

    interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: !trackingGranted,
    });

    const unsubLoaded = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      log('[Ads] Interstitial loaded');
      interstitialLoaded = true;
    });

    const unsubError = interstitialAd.addAdEventListener(AdEventType.ERROR, (err: any) => {
      log('[Ads] Interstitial error:', err?.message || err);
      interstitialLoaded = false;
      setTimeout(() => void loadInterstitialAd(), 30000);
    });

    const unsubClosed = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      log('[Ads] Interstitial closed, reloading...');
      interstitialLoaded = false;
      void loadInterstitialAd();
    });

    interstitialUnsubscribers = [
      typeof unsubLoaded === 'function' ? unsubLoaded : () => unsubLoaded?.remove?.(),
      typeof unsubError === 'function' ? unsubError : () => unsubError?.remove?.(),
      typeof unsubClosed === 'function' ? unsubClosed : () => unsubClosed?.remove?.(),
    ];

    interstitialAd.load();
  } catch (e: any) {
    log('[Ads] Failed to load interstitial:', e?.message);
    interstitialLoaded = false;
  }
}

/**
 * Show an interstitial ad. Returns true only when an ad was actually shown.
 */
export async function showInterstitialAd(): Promise<boolean> {
  if (isAdFreeUser) {
    log('[Ads] Ad-free user, skipping interstitial');
    return false;
  }

  if (!adsInitialized) {
    log('[Ads] Not initialized, skipping interstitial');
    return false;
  }

  const now = Date.now();
  if (now - lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) {
    log('[Ads] Cooldown active, skipping interstitial');
    return false;
  }

  if (!interstitialLoaded || !interstitialAd) {
    log('[Ads] Interstitial not ready, preloading for next time');
    void loadInterstitialAd();
    return false;
  }

  try {
    if (typeof interstitialAd.show !== 'function') {
      log('[Ads] Interstitial show() is not callable');
      interstitialLoaded = false;
      void loadInterstitialAd();
      return false;
    }

    log('[Ads] Showing interstitial...');
    await interstitialAd.show();
    lastInterstitialTime = now;
    interstitialLoaded = false;
    return true;
  } catch (e: any) {
    log('[Ads] Failed to show interstitial:', e?.message);
    interstitialLoaded = false;
    void loadInterstitialAd();
    return false;
  }
}

export function isAdsReady(): boolean {
  return adsInitialized;
}

export function isTrackingGranted(): boolean {
  return trackingGranted;
}

export function hasInterstitialCooldownPassed(): boolean {
  return Date.now() - lastInterstitialTime >= INTERSTITIAL_COOLDOWN_MS;
}

const PLAYER_THRESHOLD_SHOWN_KEY = 'statflow_interstitial_player_threshold_shown';

/**
 * One-time interstitial when user adds more than 3 players (4th player).
 */
export async function checkAndShowPlayerThresholdInterstitial(totalPlayers: number): Promise<void> {
  if (totalPlayers <= 3 || isAdFreeUser) return;

  try {
    const alreadyShown = await AsyncStorage.getItem(PLAYER_THRESHOLD_SHOWN_KEY);
    if (alreadyShown === 'true') return;

    if (!hasInterstitialCooldownPassed()) return;

    const shown = await showInterstitialAd();
    if (shown) {
      await AsyncStorage.setItem(PLAYER_THRESHOLD_SHOWN_KEY, 'true');
    }
  } catch (e) {
    log('[Ads] Error checking player threshold:', e);
  }
}

const TRACKED_SPORTS_KEY = 'statflow_tracked_sports';
const SPORTS_THRESHOLD_SHOWN_KEY = 'statflow_interstitial_sports_threshold_shown';

/**
 * One-time interstitial when user tracks more than 2 sports (3rd unique sport).
 */
export async function checkAndShowSportsThresholdInterstitial(sports: string[]): Promise<void> {
  if (sports.length <= 2 || isAdFreeUser) return;

  try {
    const alreadyShown = await AsyncStorage.getItem(SPORTS_THRESHOLD_SHOWN_KEY);
    if (alreadyShown === 'true') return;

    if (!hasInterstitialCooldownPassed()) return;

    const shown = await showInterstitialAd();
    if (shown) {
      await AsyncStorage.setItem(SPORTS_THRESHOLD_SHOWN_KEY, 'true');
    }
  } catch (e) {
    log('[Ads] Error checking sports threshold:', e);
  }
}

export async function getTrackedSports(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(TRACKED_SPORTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    log('[Ads] Error getting tracked sports:', e);
    return [];
  }
}

export async function addTrackedSport(sport: string): Promise<string[]> {
  try {
    const current = await getTrackedSports();
    if (!current.includes(sport)) {
      const updated = [...current, sport];
      await AsyncStorage.setItem(TRACKED_SPORTS_KEY, JSON.stringify(updated));
      return updated;
    }
    return current;
  } catch (e) {
    log('[Ads] Error adding tracked sport:', e);
    return [];
  }
}
