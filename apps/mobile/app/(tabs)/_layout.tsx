import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Easing, Platform, Pressable, Text, View } from 'react-native';
import { getMobilePrimaryNavigationItems, type AppNavigationItemId } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { palette } from '@/shared/ui/theme';

const MOBILE_TAB_ADAPTER: Record<AppNavigationItemId, {
  name: string;
  iconName: ComponentProps<typeof Ionicons>['name'];
  activeIconName: ComponentProps<typeof Ionicons>['name'];
}> = {
  home: { name: 'index', iconName: 'home-outline', activeIconName: 'home' },
  overview: { name: 'overview', iconName: 'grid-outline', activeIconName: 'grid' },
  locations: { name: 'locations', iconName: 'location-outline', activeIconName: 'location' },
  activity: { name: 'activity', iconName: 'time-outline', activeIconName: 'time' },
  categories: { name: 'categories', iconName: 'briefcase-outline', activeIconName: 'briefcase' },
  tags: { name: 'categories', iconName: 'pricetags-outline', activeIconName: 'pricetags' },
  scan: { name: 'scan', iconName: 'scan-outline', activeIconName: 'scan' },
  profile: { name: 'profile', iconName: 'person-circle-outline', activeIconName: 'person-circle' },
};

const mobileTabItems = getMobilePrimaryNavigationItems().map((item) => ({
  ...item,
  ...MOBILE_TAB_ADAPTER[item.id],
}));

const TAB_TRANSITION_DURATION_MS = 140;
const TAB_ICON_SIZE = 25;
const TAB_HIT_SLOP = {
  top: 8,
  right: 8,
  bottom: 8,
  left: 8,
} as const;

type MobileTabItem = (typeof mobileTabItems)[number];
type TabsProps = ComponentProps<typeof Tabs>;
type TabBarProps = Parameters<NonNullable<TabsProps['tabBar']>>[0];

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (!loading && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => (
        <MobileTabBar
          {...props}
          items={mobileTabItems}
          bottomInset={Math.max(insets.bottom, 8)}
        />
      )}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        freezeOnBlur: true,
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: TAB_TRANSITION_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          },
        },
      }}
      >
      {mobileTabItems.map((item) => (
        <Tabs.Screen
          key={item.id}
          name={item.name}
          options={{
            title: item.shortLabel,
          }}
        />
      ))}
      <Tabs.Screen
        name="locations"
        options={{
          href: null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          href: null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

function MobileTabBar({
  state,
  descriptors,
  navigation,
  items,
  bottomInset,
}: TabBarProps & {
  items: MobileTabItem[];
  bottomInset: number;
}) {
  return (
    <View style={[tabBarContainerStyle, { paddingBottom: bottomInset }]}>
      {state.routes.map((route, routeIndex) => {
        const item = items.find((candidate) => candidate.name === route.name);
        if (!item) {
          return null;
        }

        const isFocused = state.index === routeIndex;
        const tintColor = isFocused ? palette.brandStrong : palette.textSoft;

        const handlePress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const handleLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : undefined}
            accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
            onPress={handlePress}
            onLongPress={handleLongPress}
            hitSlop={TAB_HIT_SLOP}
            style={({ pressed }) => [
              tabBarItemStyle,
              pressed ? pressedTabBarItemStyle : null,
            ]}
          >
            <View style={tabIconShellStyle}>
              <Ionicons
                name={isFocused ? item.activeIconName : item.iconName}
                size={TAB_ICON_SIZE}
                color={tintColor}
              />
            </View>
            <Text style={[tabLabelTextStyle, isFocused ? activeTabLabelTextStyle : null, { color: tintColor }]}>
              {item.shortLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const tabBarContainerStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-around' as const,
  minHeight: 64,
  paddingTop: 6,
  paddingHorizontal: 8,
  borderTopWidth: 1,
  borderTopColor: palette.borderSoft,
  backgroundColor: 'rgba(255,255,255,0.98)',
  ...(Platform.OS === 'ios' ? {
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -6 },
  } : {
    elevation: 8,
  }),
};

const tabBarItemStyle = {
  flex: 1,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 2,
  minHeight: 48,
};

const pressedTabBarItemStyle = {
  opacity: 0.68,
};

const tabIconShellStyle = {
  width: 32,
  height: 28,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const tabLabelTextStyle = {
  fontSize: 11,
  fontWeight: '700' as const,
};

const activeTabLabelTextStyle = {
  fontWeight: '800' as const,
};
