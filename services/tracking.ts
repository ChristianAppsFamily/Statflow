import { Platform } from 'react-native';
import { 
  requestTrackingPermissionsAsync, 
  getTrackingPermissionsAsync
} from 'expo-tracking-transparency';

export async function requestTrackingPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    console.log('[Tracking] ATT only applies to iOS, granting by default');
    return true;
  }

  try {
    const { status: existingStatus } = await getTrackingPermissionsAsync();
    console.log('[Tracking] Existing ATT status:', existingStatus);

    if (existingStatus === 'granted') return true;
    if (existingStatus === 'denied') return false;

    const { status } = await requestTrackingPermissionsAsync();
    console.log('[Tracking] ATT request result:', status);
    return status === 'granted';
  } catch (e) {
    console.log('[Tracking] Error requesting ATT permission:', e);
    return false;
  }
}

export async function getTrackingStatus(): Promise<string> {
  if (Platform.OS !== 'ios') return 'granted';

  try {
    const { status } = await getTrackingPermissionsAsync();
    return status;
  } catch {
    return 'undetermined';
  }
}
