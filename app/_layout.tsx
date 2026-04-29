import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppProvider } from "@/contexts/AppContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { initializeAds, showInterstitialAd, hasInterstitialCooldownPassed } from "@/services/ads";
import { Colors } from "@/constants/colors";

const APP_OPENS_LIFETIME_KEY = "statflow_app_opens_lifetime";
const FIRST_OPEN_COMPLETED_KEY = "statflow_first_open_completed";

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
      return;
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
  } catch (e) {
    console.log("[App] Error tracking app opens:", e);
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
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      console.log('[App] Initializing ads and requesting ATT...');
      void initializeAds().then(() => {
        void trackAppOpenAndMaybeShowAd();
      });
    }
  }, []);

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
