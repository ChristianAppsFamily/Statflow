import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { requestTrackingPermissionsAsync, getTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Colors } from '@/constants/colors';

interface ATTPermissionScreenProps {
  onComplete: () => void;
}

export default function ATTPermissionScreen({ onComplete }: ATTPermissionScreenProps) {
  const [status, setStatus] = useState<string>('checking');

  useEffect(() => {
    void checkExistingPermission();
  }, []);

  async function checkExistingPermission() {
    if (Platform.OS !== 'ios') {
      onComplete();
      return;
    }

    try {
      const { status: existingStatus } = await getTrackingPermissionsAsync();
      if (__DEV__) console.log('[ATT Screen] Existing status:', existingStatus);

      if (existingStatus === 'granted' || existingStatus === 'denied') {
        onComplete();
        return;
      }

      setStatus('ready');
    } catch (e) {
      if (__DEV__) console.log('[ATT Screen] Error checking status:', e);
      onComplete();
    }
  }

  async function handleRequestPermission() {
    try {
      setStatus('requesting');
      const { status: result } = await requestTrackingPermissionsAsync();
      if (__DEV__) console.log('[ATT Screen] User response:', result);
      onComplete();
    } catch (e) {
      if (__DEV__) console.log('[ATT Screen] Error requesting permission:', e);
      onComplete();
    }
  }

  function handleAskLater() {
    // Defer the system ATT dialog; parent still marks flow completed for this install.
    onComplete();
  }

  if (status === 'checking') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Setting up...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={require('@/assets/images/statflow-icon.png')} style={styles.icon} />
        <Text style={styles.title}>App Tracking Transparency</Text>
        <Text style={styles.description}>
          StatFlow uses personalized ads to support the app. Allowing tracking helps us show relevant ads and improve your experience.
        </Text>
        <TouchableOpacity
          style={styles.allowButton}
          onPress={() => { void handleRequestPermission(); }}
        >
          <Text style={styles.allowButtonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleAskLater}
        >
          <Text style={styles.skipButtonText}>Ask Me Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  icon: {
    width: 120,
    height: 120,
    marginBottom: 24,
    borderRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  allowButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  allowButtonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingHorizontal: 48,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
