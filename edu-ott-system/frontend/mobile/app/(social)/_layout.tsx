import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function SocialLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="post-detail" options={{ title: 'Bài viết' }} />
      <Stack.Screen name="create-post" options={{ title: 'Tạo bài viết', presentation: 'modal' }} />
      <Stack.Screen name="user-profile" options={{ title: 'Trang cá nhân' }} />
    </Stack>
  );
}
