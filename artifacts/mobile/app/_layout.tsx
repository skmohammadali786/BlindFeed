import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="feed" options={{ headerShown: false }} />
      <Stack.Screen
        name="create"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen name="post/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="search" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="settings" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="identity" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="usage-insights" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="report" options={{ headerShown: false, animation: "slide_from_bottom", presentation: "modal" }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="community-guidelines" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="terms" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="rate" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="my-posts" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="scheduled-posts" options={{ headerShown: false, animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ThemeProvider>
                <AppProvider>
                  <RootLayoutNav />
                </AppProvider>
              </ThemeProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
