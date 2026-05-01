import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../context/auth';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Trò chuyện' }} />
            <Stack.Screen name="call/[roomId]" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="group-call/[roomId]" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="community" options={{ headerShown: false }} />
            <Stack.Screen name="community/index" options={{ headerShown: false }} />
            <Stack.Screen name="community/create" options={{ headerShown: false }} />
            <Stack.Screen name="community/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="(settings)/blocked-users" options={{ headerShown: false }} />
            <Stack.Screen name="(settings)/archived-conversations" options={{ headerShown: false }} />
            <Stack.Screen name="(social)" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
