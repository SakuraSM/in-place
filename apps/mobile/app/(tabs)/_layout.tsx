import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { getMobilePrimaryNavigationItems, type AppNavigationItemId } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { palette } from '@/shared/ui/theme';

const MOBILE_TAB_ADAPTER: Record<AppNavigationItemId, {
  name: string;
  iconName: ComponentProps<typeof Ionicons>['name'];
}> = {
  home: { name: 'index', iconName: 'home-outline' },
  overview: { name: 'overview', iconName: 'grid-outline' },
  locations: { name: 'locations', iconName: 'location-outline' },
  activity: { name: 'activity', iconName: 'time-outline' },
  categories: { name: 'categories', iconName: 'pricetags-outline' },
  tags: { name: 'categories', iconName: 'pricetags-outline' },
  scan: { name: 'scan', iconName: 'scan-outline' },
  profile: { name: 'profile', iconName: 'person-circle-outline' },
};

const mobileTabItems = getMobilePrimaryNavigationItems().map((item) => ({
  ...item,
  ...MOBILE_TAB_ADAPTER[item.id],
}));

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (!loading && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.brandStrong,
        tabBarInactiveTintColor: palette.textSoft,
        tabBarStyle: {
          height: 58 + Math.max(insets.bottom, 8),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: palette.borderSoft,
          backgroundColor: 'rgba(255,255,255,0.96)',
          ...(Platform.OS === 'ios' ? {
            shadowColor: '#0f172a',
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: -6 },
          } : {
            elevation: 8,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 1,
        },
      }}
      >
      {mobileTabItems.map((item) => (
        <Tabs.Screen
          key={item.id}
          name={item.name}
          options={{
            title: item.shortLabel,
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? item.iconName.replace('-outline', '') as typeof item.iconName : item.iconName} size={23} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
