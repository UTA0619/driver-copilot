import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '@/lib/haptics';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Explicit icon map prevents silent failures when an icon name has no -outline variant
const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  flash:    { active: 'flash',    inactive: 'flash-outline' },
  wallet:   { active: 'wallet',   inactive: 'wallet-outline' },
  map:      { active: 'map',      inactive: 'map-outline' },
  bulb:     { active: 'bulb',     inactive: 'bulb-outline' },
};

function TabIcon({ iconKey, focused }: { iconKey: string; focused: boolean }) {
  const icons = TAB_ICONS[iconKey];
  return (
    <Ionicons
      name={focused ? icons.active : icons.inactive}
      size={24}
      color={focused ? '#3b82f6' : '#64748b'}
    />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Respect bottom inset for gesture-nav Android and home-indicator iOS
  const tabBarHeight = 60 + (Platform.OS === 'android' ? insets.bottom : 0);

  return (
    <Tabs
      screenListeners={{
        tabPress: () => hapticLight(),
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Offers',
          tabBarAccessibilityLabel: 'Offers tab',
          tabBarIcon: ({ focused }) => <TabIcon iconKey="flash" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarAccessibilityLabel: 'Earnings tab',
          tabBarIcon: ({ focused }) => <TabIcon iconKey="wallet" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Heatmap',
          tabBarAccessibilityLabel: 'Heatmap tab',
          tabBarIcon: ({ focused }) => <TabIcon iconKey="map" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="coaching"
        options={{
          title: 'Coaching',
          tabBarAccessibilityLabel: 'Coaching tab',
          tabBarIcon: ({ focused }) => <TabIcon iconKey="bulb" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
