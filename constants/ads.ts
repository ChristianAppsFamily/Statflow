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
  },
  android: {
    banner: 'ca-app-pub-3002325591150738/9554545711',
    interstitial: 'ca-app-pub-3002325591150738/8460955892',
  },
  default: {
    banner: '',
    interstitial: '',
  },
}) as { banner: string; interstitial: string };

export const TEST_AD_UNIT_IDS = Platform.select({
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
  default: {
    banner: '',
    interstitial: '',
  },
}) as { banner: string; interstitial: string };

export const USE_TEST_ADS = __DEV__;

export function getAdUnitId(type: 'banner' | 'interstitial'): string {
  return USE_TEST_ADS ? TEST_AD_UNIT_IDS[type] : AD_UNIT_IDS[type];
}
