import { Platform } from 'react-native';

let trackingModule: typeof import('expo-tracking-transparency') | null = null;

async function getTrackingModule() {
  if (Platform.OS === 'web') return null;
  if (trackingModule) return trackingModule;
  try {
    trackingModule = await import('expo-tracking-transparency');
    return trackingModule;
  } catch (e) {
    console.log('[Tracking] expo-tracking-transparency not available:', e);
    return null;
  }
}

export async function requestTrackingPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    console.log('[Tracking] ATT only applies to iOS, granting by default');
    return true;
  }

  const mod = await getTrackingModule();
  if (!mod) {
    console.log('[Tracking] Module not available, assuming no permission');
    return false;
  }

  try {
    const { status: existingStatus } = await mod.getTrackingPermissionsAsync();
    console.log('[Tracking] Existing ATT status:', existingStatus);

    if (existingStatus === 'granted') return true;
    if (existingStatus === 'denied') return false;

    const { status } = await mod.requestTrackingPermissionsAsync();
    console.log('[Tracking] ATT request result:', status);
    return status === 'granted';
  } catch (e) {
    console.log('[Tracking] Error requesting ATT permission:', e);
    return false;
  }
}

export async function getTrackingStatus(): Promise<string> {
  if (Platform.OS !== 'ios') return 'granted';

  const mod = await getTrackingModule();
  if (!mod) return 'undetermined';

  try {
    const { status } = await mod.getTrackingPermissionsAsync();
    return status;
  } catch {
    return 'undetermined';
  }
}
