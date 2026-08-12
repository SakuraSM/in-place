import { Stack } from 'expo-router';
import { Platform, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { HouseholdProvider } from '@/providers/HouseholdProvider';
import { ToastProvider } from '@/shared/ui/ToastProvider';

const STACK_TRANSITION_DURATION_MS = 220;

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <QueryProvider>
        <AuthProvider>
          <HouseholdProvider>
            <ToastProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#f7faf8' },
                  headerStyle: { backgroundColor: '#f7faf8' },
                  headerShadowVisible: false,
                  headerTitleStyle: { fontSize: 18, fontWeight: '800' },
                  animation: Platform.OS === 'android' ? 'ios_from_right' : 'simple_push',
                  animationDuration: STACK_TRANSITION_DURATION_MS,
                  freezeOnBlur: true,
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="item/form" />
                <Stack.Screen name="item/[id]" />
                <Stack.Screen name="container/[id]" />
                <Stack.Screen name="profile/ai" />
                <Stack.Screen name="profile/security" />
                <Stack.Screen name="profile/data" />
                <Stack.Screen name="profile/edit" />
                <Stack.Screen name="profile/about" />
                <Stack.Screen name="profile/household" />
                <Stack.Screen name="scan-code" />
                <Stack.Screen name="manage/categories" />
                <Stack.Screen name="manage/tags" />
                <Stack.Screen name="operations/stocktakes/index" />
                <Stack.Screen name="operations/stocktakes/[id]" />
                <Stack.Screen name="operations/reminders" />
                <Stack.Screen name="operations/reports" />
                <Stack.Screen name="operations/duplicates" />
                <Stack.Screen name="operations/labels" />
                <Stack.Screen name="household/join/[token]" />
              </Stack>
            </ToastProvider>
          </HouseholdProvider>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
