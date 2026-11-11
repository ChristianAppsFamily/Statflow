import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppProvider } from "@/contexts/AppContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { initializeAds, showInterstitialAd, hasInterstitialCooldownPassed } from "@/services/ads";
import ATTPermissionScreen from "@/components/ATTPermissionScreen";
import { Colors } from "@/constants/colors";

const APP_OPENS_LIFETIME_KEY = "statflow_app_opens_lifetime";
const FIRST_OPEN_COMPLETED_KEY = "statflow_first_open_completed";
const ATT_COMPLETED_KEY = "statflow_att_completed";

/**
 * Show interstitial when app is opened every 7th time (7, 14, 21, 28, etc.)
 * Lifetime counter - persists across all sessions
 * Does not show on the very first app open ever (fresh install)
 */
async function trackAppOpenAndMaybeShowAd(): Promise<void> {
  try {
    // Get current lifetime count
    const raw = await AsyncStorage.getItem(APP_OPENS_LIFETIME_KEY);
    let count: number = raw ? parseInt(raw, 10) : 0;
    
    // Check if this is the first open ever
    const firstOpenCompleted = await AsyncStorage.getItem(FIRST_OPEN_COMPLETED_KEY);
    const isFirstOpenEver = firstOpenCompleted !== 'true';
    
    // Increment counter
    count += 1;
    await AsyncStorage.setItem(APP_OPENS_LIFETIME_KEY, count.toString());
    console.log("[App] Lifetime open count:", count);

    // Mark first open as completed
    if (isFirstOpenEver) {
      await AsyncStorage.setItem(FIRST_OPEN_COMPLETED_KEY, 'true');
      console.log("[App] First open ever - not showing interstitial");
      return count;
    }

    // Show interstitial every 7th open (7, 14, 21, 28, etc.)
    if (count % 7 === 0) {
      // Check cooldown before showing
      if (!hasInterstitialCooldownPassed()) {
        console.log("[App] Cooldown active, skipping app open interstitial");
        return;
      }
      // Small delay so the first frame renders before ad appears
      setTimeout(() => void showInterstitialAd(), 1500);
    }

    return count;
  } catch (e) {
    console.log("[App] Error tracking app opens:", e);
    return null;
  }
}

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="session-detail" 
        options={{ 
          title: "Game Details",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.gold,
          headerTitleStyle: { color: Colors.textPrimary },
        }} 
      />
      <Stack.Screen 
        name="privacy-policy" 
        options={{ 
          title: "Privacy Policy",
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.gold,
          headerTitleStyle: { color: Colors.textPrimary },
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [attCompleted, setAttCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    void SplashScreen.hideAsync();
    
    // Check if ATT was already completed
    AsyncStorage.getItem(ATT_COMPLETED_KEY).then((value) => {
      // ATT pre-prompt is iOS-only; other platforms can initialize ads and tracking immediately
      if (value === 'true' || Platform.OS !== 'ios') {
        setAttCompleted(true);
      } else {
        setAttCompleted(false);
      }
    });
  }, []);

  useEffect(() => {
    if (attCompleted === true && Platform.OS !== 'web') {
      console.log('[App] ATT completed, initializing ads...');
      void initializeAds().then(() => {
        void trackAppOpenAndMaybeShowAd();
      });
    }
  }, [attCompleted]);

  const handleATTComplete = async () => {
    await AsyncStorage.setItem(ATT_COMPLETED_KEY, 'true');
    setAttCompleted(true);
  };

  // Show loading or ATT screen
  if (attCompleted === null) {
    return null; // Still checking
  }

  if (attCompleted === false && Platform.OS === 'ios') {
    return <ATTPermissionScreen onComplete={handleATTComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <PlayerProvider>
          <SubscriptionProvider>
            <GestureHandlerRootView>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </SubscriptionProvider>
        </PlayerProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}
