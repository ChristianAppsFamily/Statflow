import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform, StatusBar, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppProvider } from "@/contexts/AppContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { initializeAds, showInterstitialAd, hasInterstitialCooldownPassed } from "@/services/ads";
import ATTPermissionScreen from "@/components/ATTPermissionScreen";
import { useThemeColors } from "@/hooks/useThemeColors";

const APP_OPENS_LIFETIME_KEY = "statflow_app_opens_lifetime";
const FIRST_OPEN_COMPLETED_KEY = "statflow_first_open_completed";
const ATT_COMPLETED_KEY = "statflow_att_completed";

/**
 * Show interstitial when app is opened every 7th time (7, 14, 21, 28, etc.).
 * Skips the very first app open after install.
 */
async function trackAppOpenAndMaybeShowAd(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(APP_OPENS_LIFETIME_KEY);
    let count: number = raw ? parseInt(raw, 10) : 0;

    const firstOpenCompleted = await AsyncStorage.getItem(FIRST_OPEN_COMPLETED_KEY);
    const isFirstOpenEver = firstOpenCompleted !== 'true';

    count += 1;
    await AsyncStorage.setItem(APP_OPENS_LIFETIME_KEY, count.toString());
    if (__DEV__) console.log("[App] Lifetime open count:", count);

    if (isFirstOpenEver) {
      await AsyncStorage.setItem(FIRST_OPEN_COMPLETED_KEY, 'true');
      return count;
    }

    if (count % 7 === 0) {
      if (!hasInterstitialCooldownPassed()) {
        return count;
      }
      setTimeout(() => void showInterstitialAd(), 1500);
    }

    return count;
  } catch (e) {
    if (__DEV__) console.log("[App] Error tracking app opens:", e);
    return null;
  }
}

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { colors, resolvedScheme } = useThemeColors();

  return (
    <>
      <StatusBar barStyle={resolvedScheme === "light" ? "dark-content" : "light-content"} />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="session-detail"
          options={{
            title: "Game Details",
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.gold,
            headerTitleStyle: { color: colors.textPrimary },
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        <Stack.Screen
          name="privacy-policy"
          options={{
            title: "Privacy Policy",
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.gold,
            headerTitleStyle: { color: colors.textPrimary },
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [attCompleted, setAttCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    void SplashScreen.hideAsync();

    AsyncStorage.getItem(ATT_COMPLETED_KEY).then((value) => {
      if (value === 'true' || Platform.OS !== 'ios') {
        setAttCompleted(true);
      } else {
        setAttCompleted(false);
      }
    });
  }, []);

  useEffect(() => {
    if (attCompleted === true && Platform.OS !== 'web') {
      if (__DEV__) console.log('[App] ATT completed, initializing ads...');
      void initializeAds().then(() => {
        void trackAppOpenAndMaybeShowAd();
      });
    }
  }, [attCompleted]);

  const handleATTComplete = async () => {
    await AsyncStorage.setItem(ATT_COMPLETED_KEY, 'true');
    setAttCompleted(true);
  };

  if (attCompleted === null) {
    return null;
  }

  if (attCompleted === false && Platform.OS === 'ios') {
    return <ATTPermissionScreen onComplete={handleATTComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <PlayerProvider>
          <SubscriptionProvider>
            <GestureHandlerRootView style={styles.root}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </SubscriptionProvider>
        </PlayerProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
