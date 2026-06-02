import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useBadge } from '@/context/badge';

// ─── Badge Dot / Count bubble ────────────────────────────────
function BadgeDot({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

// ─── Tab icon with optional badge ────────────────────────────
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  size?: number;
  badge?: number;
}) {
  return (
    <View style={{ position: 'relative' }}>
      <Ionicons size={props.size || 24} style={{ marginBottom: -3 }} {...props} />
      {props.badge !== undefined && props.badge > 0 && (
        <BadgeDot count={props.badge} />
      )}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const resolvedScheme: 'light' | 'dark' = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[resolvedScheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unreadMessages, unreadNotifications } = useBadge();

  const headerBg = resolvedScheme === 'dark' ? colors.surface : colors.tint;
  const headerTitleColor = resolvedScheme === 'dark' ? colors.text : '#FFFFFF';
  const headerIconColor = resolvedScheme === 'dark' ? colors.text : '#FFFFFF';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 56 + insets.bottom,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: headerBg,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: headerTitleColor,
        },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <TabBarIcon
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              color={color}
              badge={unreadMessages}
            />
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', paddingRight: 16, gap: 18 }}>
              <TouchableOpacity onPress={() => router.push('/search-messages' as any)}>
                <Ionicons name="search-outline" size={22} color={headerIconColor} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/create-group' as any)}>
                <Ionicons name="create-outline" size={22} color={headerIconColor} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Danh bạ',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'people' : 'people-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Nhật ký',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'newspaper' : 'newspaper-outline'}
              color={color}
              badge={unreadNotifications}
            />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'ChatBot AI',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'sparkles' : 'sparkles-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mydocument"
        options={{
          title: 'My Document',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <TabBarIcon name={focused ? 'cloud' : 'cloud-outline'} color={color} />
          ),
          headerRight: () => (
            <View style={{ paddingRight: 16 }}>
              <Ionicons name="information-circle-outline" size={22} color={headerIconColor} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});
