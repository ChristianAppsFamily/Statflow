import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAdUnitId } from '@/constants/ads';
import { isAdsReady, isTrackingGranted } from '@/services/ads';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface BannerAdProps {
  /** Where to render the banner and which safe-area inset to apply */
  position?: 'top' | 'bottom';
  size?: 'banner' | 'largeBanner' | 'mediumRectangle';
}

const RETRY_INTERVAL_MS = 500;  // check every 500ms
const MAX_RETRIES = 20;          // give up after 10s total

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

    function tryLoad() {
      if (!isAdsReady()) {
        // Ads SDK not yet initialized — retry after a short delay
        if (retryCount.current < MAX_RETRIES) {
          retryCount.current += 1;
          console.log(`[BannerAd] Ads not ready, retry ${retryCount.current}/${MAX_RETRIES}...`);
          setTimeout(tryLoad, RETRY_INTERVAL_MS);
        } else {
          console.log('[BannerAd] Max retries reached, giving up');
        }
        return;
      }

      try {
        const gma = require('react-native-google-mobile-ads');
        const { BannerAd: NativeBannerAd, BannerAdSize } = gma;

        const sizeMap: Record<string, string> = {
          banner: BannerAdSize.ADAPTIVE_BANNER,
          largeBanner: BannerAdSize.LARGE_BANNER,
          mediumRectangle: BannerAdSize.MEDIUM_RECTANGLE,
        };

        console.log('[BannerAd] Ads ready, loading banner...');
        setBannerSize(sizeMap[size] || BannerAdSize.ADAPTIVE_BANNER);
        setAdComponent(() => NativeBannerAd);
      } catch (e) {
        console.log('[BannerAd] react-native-google-mobile-ads not available:', e);
      }
    }

    tryLoad();
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
          console.log('[BannerAd] Failed to load:', error);
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
