import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";

// Wrap the key check in a try-catch
let CLERK_PUBLISHABLE_KEY: string;
try {
  CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
} catch (error) {
  console.error("Error accessing environment variables:", error);
  CLERK_PUBLISHABLE_KEY = "";
}

// Cache the Clerk JWT
const tokenCache = {
  async getToken(key: string) {
    try {
      const token = await SecureStore.getItemAsync(key);
      return token;
    } catch (err) {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.deleteItemAsync(key);
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const InitialLayout = () => {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(authenticated)";

    if (isSignedIn && !inAuthGroup) {
      router.replace("/(authenticated)/(tabs)");
    } else if (!isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(authenticated)" />
      <Stack.Screen name="auth" />
    </Stack>
  );
};

const RootLayoutNav = () => {
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <Text>Configuration Error</Text>
        <Text>Please check environment setup</Text>
      </View>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
      appearance={{
        baseTheme: undefined,
      }}
    >
      <ActionSheetProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <StatusBar style="light" />
              <InitialLayout />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ActionSheetProvider>
    </ClerkProvider>
  );
};

export default RootLayoutNav;
