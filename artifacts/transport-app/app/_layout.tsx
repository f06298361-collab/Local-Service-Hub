import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClerkProvider, useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAppAuth } from '@/context/AuthContext';
import { TripProvider } from '@/context/TripContext';
import { View, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

let globalGetToken: (() => Promise<string | null>) | null = null;
setAuthTokenGetter(async () => {
  if (globalGetToken) return await globalGetToken();
  return null;
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

function AuthTokenSetter({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  useEffect(() => {
    globalGetToken = getToken;
  }, [getToken]);
  return <>{children}</>;
}

function RoleRouter() {
  const { isLoaded, isSignedIn, profile, isLoadingProfile } = useAppAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || (isSignedIn && isLoadingProfile)) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!isSignedIn) {
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
    } else {
      if (profile && !profile.firstName) {
        if (segments[0] !== 'profile-setup') {
          router.replace('/profile-setup');
        }
      } else if (profile) {
        const role = profile.role;
        const currentGroup = segments[0];
        
        if (role === 'customer' && currentGroup !== '(customer)') {
          router.replace('/(customer)/home');
        } else if (role === 'driver' && currentGroup !== '(driver)') {
          router.replace('/(driver)/home');
        } else if (role === 'admin' && currentGroup !== '(admin)') {
          router.replace('/(admin)/dashboard');
        } else if (!role) {
            // Assume customer default if missing or unassigned initially?
            // Actually, server sets role. Let's just push to customer if it somehow is null and needs routing.
            if (currentGroup !== '(customer)') router.replace('/(customer)/home');
        }
      }
    }
  }, [isLoaded, isSignedIn, profile, isLoadingProfile, segments, router]);

  if (!isLoaded || (isSignedIn && isLoadingProfile)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E1A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return <Slot />;
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
    <ClerkProvider 
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!} 
      tokenCache={tokenCache}
    >
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <AuthTokenSetter>
                  <AuthProvider>
                    <TripProvider>
                      <RoleRouter />
                    </TripProvider>
                  </AuthProvider>
                </AuthTokenSetter>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}