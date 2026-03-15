import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable, View, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: colors.text,
        },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color }) => <TabBarIcon name="comment" color={color} />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', paddingRight: 15, gap: 15 }}>
              <FontAwesome name="search" size={20} color={colors.text} />
              <FontAwesome name="plus" size={20} color={colors.text} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Lớp học',
          tabBarIcon: ({ color }) => <TabBarIcon name="graduation-cap" color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Nhóm',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}

