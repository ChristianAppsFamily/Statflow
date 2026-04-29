import { Platform } from 'react-native';
import { requestTrackingPermission } from '@/services/tracking';

let adsInitialized = false;
let trackingGranted = false;
let mobileAdsInstance: any = null;
let InterstitialAd: any = null;
let AdEventType: any = null;
let interstitialAd: any = null;
let interstitialLoaded = false;
let lastInterstitialTime = 0;
const INTERSTITIAL_COOLDOWN_MS = 60000; // 60 seconds between interstitials

// In-memory counter for players added this session
let playersCreatedInSession = 0;

/**
 * Initialize AdMob with ATT permission request
 */
export async function initializeAds(): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('[Ads] AdMob not supported on web');
    return;
  }

  if (adsInitialized) {
    console.log('[Ads] Already initialized');
    return;
  }

  try {
    // Step 1: ATT permission (iOS)
    console.log('[Ads] Requesting ATT permission...');
    trackingGranted = await requestTrackingPermission();
    console.log('[Ads] Tracking granted:', trackingGranted);

    // Step 2: Import SDK dynamically (safe — won't crash if not installed)
    let MobileAds: any = null;
    try {
      const gma = require('react-native-google-mobile-ads');
      MobileAds = gma.MobileAds || gma.default;
      InterstitialAd = gma.InterstitialAd;
      AdEventType = gma.AdEventType;

      if (!MobileAds) throw new Error('MobileAds not found in SDK');
      console.log('[Ads] SDK imported successfully');
    } catch (importErr: any) {
      console.log('[Ads] SDK unavailable (Expo Go / not installed):', importErr?.message);
      return;
    }

    // Step 3: Get SDK instance and configure
    const instance = typeof MobileAds === 'function' ? MobileAds() : MobileAds;
    mobileAdsInstance = instance;

    await instance.setRequestConfiguration({
      maxAdContentRating: 'G',
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : undefined,
    });

    // Step 4: Initialize
    await instance.initialize();
    adsInitialized = true;
    console.log('[Ads] Initialized successfully');

    // Preload first interstitial
    void loadInterstitialAd();
  } catch (e: any) {
    console.log('[Ads] Init failed:', e?.message || e);
    adsInitialized = false;
  }
}

async function loadInterstitialAd(): Promise<void> {
  if (!adsInitialized || !InterstitialAd || !AdEventType) return;

  try {
    const { getAdUnitId } = require('@/constants/ads');
    const adUnitId = getAdUnitId('interstitial');
    if (!adUnitId) return;

    console.log('[Ads] Loading interstitial...', adUnitId);

    interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: !trackingGranted,
    });

    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[Ads] ✅ Interstitial loaded');
      interstitialLoaded = true;
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, (err: any) => {
      console.log('[Ads] ❌ Interstitial error:', err?.message || err);
      interstitialLoaded = false;
      setTimeout(() => void loadInterstitialAd(), 30000);
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[Ads] Interstitial closed, reloading...');
      interstitialLoaded = false;
      void loadInterstitialAd();
    });

    interstitialAd.load();
  } catch (e: any) {
    console.log('[Ads] Failed to load interstitial:', e?.message);
    interstitialLoaded = false;
  }
}

/**
 * Show an interstitial ad. Safe — no-ops if not ready or in cooldown.
 */
export async function showInterstitialAd(): Promise<void> {
  if (!adsInitialized) {
    console.log('[Ads] Not initialized, skipping interstitial');
    return;
  }

  const now = Date.now();
  if (now - lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) {
    console.log('[Ads] Cooldown active, skipping interstitial');
    return;
  }

  if (!interstitialLoaded || !interstitialAd) {
    console.log('[Ads] Interstitial not ready, preloading for next time');
    void loadInterstitialAd();
    return;
  }

  try {
    console.log('[Ads] Showing interstitial...');
    await interstitialAd.show();
    lastInterstitialTime = now;
  } catch (e: any) {
    console.log('[Ads] Failed to show interstitial:', e?.message);
    interstitialLoaded = false;
    void loadInterstitialAd();
  }
}

export function isAdsReady(): boolean {
  return adsInitialized;
}

export function isTrackingGranted(): boolean {
  return trackingGranted;
}

export async function showRewardedAd(): Promise<boolean> {
  console.log('[Ads] Rewarded ads not yet implemented');
  return false;
}

// ─── Cooldown helper ─────────────────────────────────────────────────────────

/**
 * Check if the 60-second cooldown has passed since the last interstitial
 */
export function hasInterstitialCooldownPassed(): boolean {
  const now = Date.now();
  return now - lastInterstitialTime >= INTERSTITIAL_COOLDOWN_MS;
}

// ─── Player threshold interstitial ───────────────────────────────────────────

const PLAYER_THRESHOLD_SHOWN_KEY = 'statflow_interstitial_player_threshold_shown';

/**
 * Check and show interstitial when user adds more than 3 players total (4th player)
 * One-time trigger - only fires once
 */
export async function checkAndShowPlayerThresholdInterstitial(totalPlayers: number): Promise<void> {
  if (totalPlayers <= 3) return;

  try {
    const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const alreadyShown = await AsyncStorage.getItem(PLAYER_THRESHOLD_SHOWN_KEY);
    if (alreadyShown === 'true') {
      console.log('[Ads] Player threshold interstitial already shown');
      return;
    }

    if (!hasInterstitialCooldownPassed()) {
      console.log('[Ads] Cooldown active, skipping player threshold interstitial');
      return;
    }

    await showInterstitialAd();
    await AsyncStorage.setItem(PLAYER_THRESHOLD_SHOWN_KEY, 'true');
    console.log('[Ads] Player threshold interstitial shown');
  } catch (e) {
    console.log('[Ads] Error checking player threshold:', e);
  }
}

// ─── Sports threshold interstitial ───────────────────────────────────────────

const TRACKED_SPORTS_KEY = 'statflow_tracked_sports';
const SPORTS_THRESHOLD_SHOWN_KEY = 'statflow_interstitial_sports_threshold_shown';

/**
 * Check and show interstitial when user tracks more than 2 sports total (3rd unique sport)
 * One-time trigger - only fires once
 */
export async function checkAndShowSportsThresholdInterstitial(sports: string[]): Promise<void> {
  if (sports.length <= 2) return;

  try {
    const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const alreadyShown = await AsyncStorage.getItem(SPORTS_THRESHOLD_SHOWN_KEY);
    if (alreadyShown === 'true') {
      console.log('[Ads] Sports threshold interstitial already shown');
      return;
    }

    if (!hasInterstitialCooldownPassed()) {
      console.log('[Ads] Cooldown active, skipping sports threshold interstitial');
      return;
    }

    await showInterstitialAd();
    await AsyncStorage.setItem(SPORTS_THRESHOLD_SHOWN_KEY, 'true');
    console.log('[Ads] Sports threshold interstitial shown');
  } catch (e) {
    console.log('[Ads] Error checking sports threshold:', e);
  }
}

/**
 * Get the list of tracked sports from AsyncStorage
 */
export async function getTrackedSports(): Promise<string[]> {
  try {
    const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const stored = await AsyncStorage.getItem(TRACKED_SPORTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.log('[Ads] Error getting tracked sports:', e);
    return [];
  }
}

/**
 * Add a sport to the tracked sports list and return the updated list
 */
export async function addTrackedSport(sport: string): Promise<string[]> {
  try {
    const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const current = await getTrackedSports();
    if (!current.includes(sport)) {
      const updated = [...current, sport];
      await AsyncStorage.setItem(TRACKED_SPORTS_KEY, JSON.stringify(updated));
      console.log('[Ads] Tracked sports updated:', updated);
      return updated;
    }
    return current;
  } catch (e) {
    console.log('[Ads] Error adding tracked sport:', e);
    return [];
  }
}

// ─── Player interstitial counter ─────────────────────────────────────────────

export function incrementPlayersCreated(): void {
  playersCreatedInSession++;
  console.log('[Ads] Players created this session:', playersCreatedInSession);
}

/**
 * Returns true when 2nd or more player has been added (triggers interstitial)
 */
export function shouldShowInterstitialForPlayer(): boolean {
  return playersCreatedInSession >= 2;
}

export function resetSessionCounters(): void {
  playersCreatedInSession = 0;
}
