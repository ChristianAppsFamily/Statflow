import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shield, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Colors } from '@/constants/colors';
import BannerAdComponent from '@/components/BannerAd';

export default function SettingsScreen() {
  const { settings, updateSettings, resetAllData } = useApp();
  const {
    isAdFree,
    isPurchasing,
    isRestoring,
    purchaseNoAds,
    restorePurchases,
    lifetimePackage,
    purchaseError,
    isLoading,
  } = useSubscription();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const instagramUrl = 'https://instagram.com/statflowapp';
  const privacyPolicyUrl = 'https://christianappsfamily.github.io/statflow-privacy/';

  const handleSupportUpgrade = async () => {
    if (isAdFree) return;
    console.log('[Settings] Support upgrade tapped');
    
    // Check if product is available
    if (!lifetimePackage) {
      Alert.alert(
        'Not Available',
        'The upgrade is not available right now. Please ensure you\'re on a device with App Store access and try again.'
      );
      return;
    }
    
    try {
      await purchaseNoAds();
      Alert.alert(
        'Thank You!',
        'Ads have been removed. Thank you for supporting our education!'
      );
    } catch (error: unknown) {
      const err = error as { userCancelled?: boolean; message?: string; code?: string };
      if (err.userCancelled) {
        console.log('[Settings] Purchase cancelled by user');
        return;
      }
      console.log('[Settings] Purchase error:', err.message, err.code);
      Alert.alert(
        'Purchase Failed',
        err.message || 'Something went wrong. Please try again.'
      );
    }
  };

  const handleRestorePurchases = async () => {
    console.log('[Settings] Restore purchases tapped');
    try {
      const info = await restorePurchases();
      const hasNoAds = 'no_ads' in (info.entitlements.active ?? {});
      if (hasNoAds) {
        Alert.alert('Restored!', 'Your ad-free purchase has been restored.');
      } else {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.log('[Settings] Restore error:', err.message);
      Alert.alert(
        'Restore Failed',
        'Unable to restore purchases. Please try again later.'
      );
    }
  };

  const handleJoinJourney = async () => {
    console.log('[Settings] Join the Journey tapped');
    try {
      const supported = await Linking.canOpenURL(instagramUrl);
      if (!supported) {
        Alert.alert('Unable to open link', 'Please try again in a moment.');
        return;
      }
      await Linking.openURL(instagramUrl);
    } catch {
      Alert.alert('Error', 'Could not open Instagram.');
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      await Linking.openURL(privacyPolicyUrl);
    } catch {
      router.push('/privacy-policy');
    }
  };

  const handleContactSupport = async () => {
    const email = 'mailto:ChristianAppEmpire@gmail.com';
    try {
      const supported = await Linking.canOpenURL(email);
      if (!supported) {
        Alert.alert('Unable to open email', 'Please email us at ChristianAppEmpire@gmail.com');
        return;
      }
      await Linking.openURL(email);
    } catch {
      Alert.alert('Error', 'Could not open email client.');
    }
  };

  const handleResetData = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'This will delete all your sessions and reset settings. This cannot be undone. Continue?'
      );
      if (confirmed) {
        void resetAllData();
        alert('All data has been reset.');
      }
    } else {
      Alert.alert(
        'Reset All Data',
        'This will delete all your sessions and reset settings. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: () => {
              void resetAllData();
              Alert.alert('Success', 'All data has been reset.');
            },
          },
        ]
      );
    }
  };

  const priceLabel = lifetimePackage?.product?.priceString ?? '$4.99';

  return (
    <View style={styles.outerContainer}>
    {/* TOP BANNER AD */}
    <BannerAdComponent position="top" />
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: 16 }]}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Daily Verse</Text>
            <Text style={styles.settingDescription}>
              Show motivational verse on home screen
            </Text>
          </View>
          <Switch
            value={settings.dailyVerseEnabled}
            onValueChange={(value) => updateSettings({ dailyVerseEnabled: value })}
            trackColor={{ false: Colors.switchTrackOff, true: Colors.switchTrackOn }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Haptics</Text>
            <Text style={styles.settingDescription}>
              Vibration feedback for interactions
            </Text>
          </View>
          <Switch
            value={settings.hapticsEnabled}
            onValueChange={(value) => updateSettings({ hapticsEnabled: value })}
            trackColor={{ false: Colors.switchTrackOff, true: Colors.switchTrackOn }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SUPPORT</Text>

        <View style={styles.supportCard} testID="support-education-card">
          <Text style={styles.supportTitle}>Support Education</Text>
          <Text style={styles.supportBody}>
            Built by H & G, student-athletes, with help from our dad. We created StatFlow to make it easier to track stats and player growth during the game.{"\n\n"}
            When you upgrade, you remove ads and help support our education. Thank you for being part of the journey.
          </Text>

          {isAdFree ? (
            <View style={styles.unlockedContainer} testID="ad-free-unlocked">
              <CheckCircle size={24} color={Colors.green} />
              <Text style={styles.unlockedText}>Ad-Free Unlocked</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.primaryActionButton, (isPurchasing || isLoading) && styles.buttonDisabled]}
                onPress={() => { void handleSupportUpgrade(); }}
                activeOpacity={0.85}
                disabled={isPurchasing || isLoading}
                testID="upgrade-to-support-button"
              >
                {isPurchasing ? (
                  <ActivityIndicator color={Colors.navy} size="small" />
                ) : isLoading ? (
                  <ActivityIndicator color={Colors.navy} size="small" />
                ) : (
                  <Text style={styles.primaryActionButtonText}>Upgrade to Support</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.buttonSubtext}>{priceLabel} one-time • Removes ads</Text>
            </>
          )}

          <TouchableOpacity
            style={[styles.restoreButton, isRestoring && styles.buttonDisabled]}
            onPress={() => { void handleRestorePurchases(); }}
            activeOpacity={0.85}
            disabled={isRestoring}
            testID="restore-purchases-button"
          >
            {isRestoring ? (
              <ActivityIndicator color={Colors.gold} size="small" />
            ) : (
              <>
                <RefreshCw size={16} color={Colors.gold} />
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => { void handleJoinJourney(); }}
            activeOpacity={0.85}
            testID="join-the-journey-button"
          >
            <Text style={styles.secondaryActionButtonText}>Join the Journey</Text>
          </TouchableOpacity>
          <Text style={styles.buttonSubtext}>Follow us on Instagram</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LEGAL</Text>
        
        <TouchableOpacity
          style={styles.policyButton}
          onPress={() => { void handleOpenPrivacyPolicy(); }}
          activeOpacity={0.7}
          testID="privacy-policy-button"
        >
          <View style={styles.policyButtonInner}>
            <Shield size={20} color={Colors.gold} />
            <Text style={styles.policyButtonText}>Privacy Policy</Text>
          </View>
          <ExternalLink size={16} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.policyButton, { marginTop: 12 }]}
          onPress={() => { void handleContactSupport(); }}
          activeOpacity={0.7}
          testID="contact-support-button"
        >
          <View style={styles.policyButtonInner}>
            <ExternalLink size={20} color={Colors.gold} />
            <Text style={styles.policyButtonText}>Contact Support</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.dangerButton, { marginTop: 12 }]} onPress={handleResetData}>
          <Text style={styles.dangerButtonText}>Reset All Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.aboutSection}>
        <Text style={styles.appName}>StatFlow</Text>
        <Text style={styles.footerText}>Developed By</Text>
        <Text style={styles.companyName}>Christian App Empire LLC</Text>
        <Text style={styles.footerText}>Copyright © 2026</Text>
        <Text style={styles.footerText}>All Rights Reserved</Text>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  dangerButton: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.red,
  },
  dangerButtonText: {
    color: Colors.red,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  supportCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  supportBody: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  unlockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.green,
    marginBottom: 8,
  },
  unlockedText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.green,
  },
  primaryActionButton: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 52,
  },
  primaryActionButtonText: {
    color: Colors.navy,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
    minHeight: 44,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.gold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginVertical: 12,
  },
  secondaryActionButton: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: Colors.goldFaded,
    marginBottom: 8,
  },
  secondaryActionButtonText: {
    color: Colors.gold,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  buttonSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  policyButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  policyButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  policyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  aboutSection: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.gold,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontWeight: '600' as const,
    marginBottom: 8,
  },
});
