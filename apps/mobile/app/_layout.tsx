import { Stack } from 'expo-router';
import { Platform, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';

const STACK_TRANSITION_DURATION_MS = 220;

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <QueryProvider>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
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
            <Stack.Screen name="manage/categories" />
            <Stack.Screen name="manage/tags" />
          </Stack>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
