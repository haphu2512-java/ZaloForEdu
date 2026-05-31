import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import 'react-native-reanimated';

// Tắt toàn bộ LogBox warning/error banner trước khi deploy sản phẩm
// (người dùng cuối không cần thấy các cảnh báo kỹ thuật nội bộ)
LogBox.ignoreAllLogs();

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../context/auth';
import { BadgeProvider } from '../context/badge';
import IncomingCallOverlay from '../components/call/IncomingCallOverlay';

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
          <BadgeProvider>
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Tro chuyen' }} />
              <Stack.Screen name="(chat-info)/conversation-details" options={{ headerShown: true }} />
              <Stack.Screen name="(chat-info)/search-messages" options={{ headerShown: true }} />
              <Stack.Screen name="(chat-info)/pinned-messages" options={{ headerShown: true }} />
              <Stack.Screen name="(chat-info)/reminders" options={{ headerShown: true }} />
              <Stack.Screen name="(chat-info)/blocked-members" options={{ headerShown: true }} />
              <Stack.Screen name="(chat-info)/group-roles" options={{ headerShown: true }} />
              <Stack.Screen name="(groups)/join-group" options={{ headerShown: true }} />
              <Stack.Screen name="(groups)/join-requests" options={{ headerShown: true }} />
              <Stack.Screen name="(polls)/create-poll" options={{ headerShown: true }} />
              <Stack.Screen name="call/[roomId]" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="group-call/[roomId]" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="community" options={{ headerShown: false }} />
              <Stack.Screen name="(settings)/blocked-users" options={{ headerShown: false }} />
              <Stack.Screen name="(settings)/friend-list" options={{ headerShown: false }} />
              <Stack.Screen name="(settings)/archived-conversations" options={{ headerShown: false }} />
              <Stack.Screen name="(social)" options={{ headerShown: false }} />
            </Stack>
            <IncomingCallOverlay />
          </BadgeProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

