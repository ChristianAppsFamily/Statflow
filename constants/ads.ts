import { Platform } from 'react-native';

export const ADMOB_APP_ID = Platform.select({
  ios: 'ca-app-pub-3002325591150738~3761291425',
  android: 'ca-app-pub-3002325591150738~8013399185',
  default: '',
});

export const AD_UNIT_IDS = Platform.select({
  ios: {
    banner: 'ca-app-pub-3002325591150738/1981305892',
    interstitial: 'ca-app-pub-3002325591150738/7870657907',
    rewarded: 'ca-app-pub-3002325591150738/7870657907',
  },
  android: {
    banner: 'ca-app-pub-3002325591150738/9554545711',
    interstitial: 'ca-app-pub-3002325591150738/8460955892',
    rewarded: 'ca-app-pub-3002325591150738/8460955892',
  },
  default: {
    banner: '',
    interstitial: '',
    rewarded: '',
  },
}) as { banner: string; interstitial: string; rewarded: string };

export const TEST_AD_UNIT_IDS = Platform.select({
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  default: {
    banner: '',
    interstitial: '',
    rewarded: '',
  },
}) as { banner: string; interstitial: string; rewarded: string };

// Force test ads until production ad units are verified
export const USE_TEST_ADS = true; // was: __DEV__

export function getAdUnitId(type: 'banner' | 'interstitial' | 'rewarded'): string {
  return USE_TEST_ADS ? TEST_AD_UNIT_IDS[type] : AD_UNIT_IDS[type];
}
