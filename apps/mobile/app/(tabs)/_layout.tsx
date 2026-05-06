import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
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
          height: 74,
          paddingTop: 10,
          paddingBottom: 12,
          borderTopColor: palette.borderSoft,
          backgroundColor: 'rgba(255,255,255,0.96)',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
      >
      {mobileTabItems.map((item) => (
        <Tabs.Screen
          key={item.id}
          name={item.name}
          options={{
            title: item.shortLabel,
            tabBarIcon: ({ color, size }) => <Ionicons name={item.iconName} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
