import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * App Store / Play Store listing URL from app.json.
 * Set ios.appStoreUrl in app.json (e.g. https://apps.apple.com/app/id1234567890).
 */
export function getStoreListingUrl(): string | null {
  const config = Constants.expoConfig;
  if (Platform.OS === 'ios') {
    return config?.ios?.appStoreUrl ?? (config?.extra?.appStoreUrl as string | undefined) ?? null;
  }
  if (Platform.OS === 'android') {
    return config?.android?.playStoreUrl ?? null;
  }
  return null;
}

export function getWriteReviewUrl(): string | null {
  const listing = getStoreListingUrl();
  if (!listing) return null;

  if (listing.includes('action=write-review')) return listing;

  const separator = listing.includes('?') ? '&' : '?';
  return `${listing}${separator}action=write-review`;
}
