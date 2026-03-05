import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View } from "react-native";
import { AuthProvider } from "@/providers/AuthProvider";
import { AppProvider } from "@/providers/AppProvider";
import { trpc, trpcClient } from "@/lib/trpc";

try {
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  console.log('SplashScreen.preventAutoHideAsync error:', e);
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="log-meal" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="log-weight" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="scan-food" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="barcode-scanner" options={{ presentation: "modal", headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    try {
      SplashScreen.hideAsync();
    } catch (e) {
      console.log('SplashScreen.hideAsync error:', e);
    }
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1 }}>
          <AuthProvider>
            <AppProvider>
              <RootLayoutNav />
            </AppProvider>
          </AuthProvider>
        </View>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
