import { Stack } from 'expo-router';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item/form" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="container/[id]" />
      </Stack>
      </AuthProvider>
    </QueryProvider>
  );
}
