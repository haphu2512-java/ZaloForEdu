import { Stack } from 'expo-router';

// Expo Router uses React Navigation under the hood.
// This stack is the navigation setup for Community module.
export default function CommunityLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
