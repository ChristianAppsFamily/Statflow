import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAdUnitId } from '@/constants/ads';
import { isAdsReady, isTrackingGranted } from '@/services/ads';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface BannerAdProps {
  position?: 'top' | 'bottom';
  size?: 'banner' | 'largeBanner' | 'mediumRectangle';
}

const RETRY_INTERVAL_MS = 500;
const MAX_RETRIES = 20;

export default function BannerAdComponent({
  position = 'bottom',
  size = 'banner',
}: BannerAdProps) {
  const { isAdFree } = useSubscription();
  const insets = useSafeAreaInsets();
  const [AdComponent, setAdComponent] =
    useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [bannerSize, setBannerSize] = useState<string | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function tryLoad() {
      if (cancelled) return;

      if (!isAdsReady()) {
        if (retryCount.current < MAX_RETRIES) {
          retryCount.current += 1;
          if (__DEV__) {
            console.log(`[BannerAd] Ads not ready, retry ${retryCount.current}/${MAX_RETRIES}...`);
          }
          timeoutId = setTimeout(tryLoad, RETRY_INTERVAL_MS);
        }
        return;
      }

      try {
        const gma = require('react-native-google-mobile-ads');
        const { BannerAd: NativeBannerAd, BannerAdSize } = gma;

        if (typeof NativeBannerAd !== 'function' && typeof NativeBannerAd !== 'object') {
          return;
        }

        const sizeMap: Record<string, string> = {
          banner: BannerAdSize.ADAPTIVE_BANNER,
          largeBanner: BannerAdSize.LARGE_BANNER,
          mediumRectangle: BannerAdSize.MEDIUM_RECTANGLE,
        };

        if (cancelled) return;
        setBannerSize(sizeMap[size] || BannerAdSize.ADAPTIVE_BANNER);
        setAdComponent(() => NativeBannerAd);
      } catch (e) {
        if (__DEV__) console.log('[BannerAd] react-native-google-mobile-ads not available:', e);
      }
    }

    tryLoad();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [size]);

  if (isAdFree || Platform.OS === 'web' || !AdComponent || !bannerSize) {
    return null;
  }

  const adUnitId = getAdUnitId('banner');
  if (!adUnitId) return null;

  return (
    <View
      style={[
        styles.container,
        position === 'top'
          ? { paddingTop: insets.top }
          : { paddingBottom: insets.bottom },
      ]}
    >
      <AdComponent
        unitId={adUnitId}
        size={bannerSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: !isTrackingGranted(),
        }}
        onAdFailedToLoad={(error: Error) => {
          if (__DEV__) console.log('[BannerAd] Failed to load:', error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
