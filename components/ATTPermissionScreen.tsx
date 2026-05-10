import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { requestTrackingPermissionsAsync, getTrackingPermissionsAsync } from 'expo-tracking-transparency';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/colors';

const ATT_SHOWN_KEY = 'statflow_att_shown';

interface ATTPermissionScreenProps {
  onComplete: () => void;
}

export default function ATTPermissionScreen({ onComplete }: ATTPermissionScreenProps) {
  const [status, setStatus] = useState<string>('checking');

  useEffect(() => {
    checkAndRequestPermission();
  }, []);

  async function checkAndRequestPermission() {
    if (Platform.OS !== 'ios') {
      onComplete();
      return;
    }

    try {
      const { status: existingStatus } = await getTrackingPermissionsAsync();
      console.log('[ATT Screen] Existing status:', existingStatus);

      if (existingStatus === 'granted' || existingStatus === 'denied') {
        await AsyncStorage.setItem(ATT_SHOWN_KEY, 'true');
        onComplete();
        return;
      }

      setStatus('ready');
    } catch (e) {
      console.log('[ATT Screen] Error checking status:', e);
      onComplete();
    }
  }

  async function handleRequestPermission() {
    try {
      setStatus('requesting');
      const { status } = await requestTrackingPermissionsAsync();
      console.log('[ATT Screen] User response:', status);
      
      await AsyncStorage.setItem(ATT_SHOWN_KEY, 'true');
      onComplete();
    } catch (e) {
      console.log('[ATT Screen] Error requesting permission:', e);
      await AsyncStorage.setItem(ATT_SHOWN_KEY, 'true');
      onComplete();
    }
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
        <Text style={styles.icon}>📊</Text>
        <Text style={styles.title}>Help Keep StatFlow Free</Text>
        <Text style={styles.description}>
          StatFlow uses personalized ads to support the app and keep it free for everyone. 
          Your data helps us show relevant ads and improve your sports tracking experience.
        </Text>
        <Text style={styles.subtitle}>
          We value your privacy. You can change this anytime in Settings.
        </Text>
        
        <TouchableOpacity 
          style={styles.allowButton}
          onPress={handleRequestPermission}
        >
          <Text style={styles.allowButtonText}>Continue</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleRequestPermission}
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
    fontSize: 64,
    marginBottom: 24,
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
    color: Colors.textMuted,
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
