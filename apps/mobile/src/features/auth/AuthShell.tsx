import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { palette } from '@/shared/ui/theme';

interface AuthShellProps { title: string; children: ReactNode }

export function AuthShell({ title, children }: AuthShellProps) {
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <Screen scroll safeAreaBottom="none" contentInsetMode="form" contentStyle={{ gap: 20 }}>
      <BrandHeader title="归位" subtitle="INPLACE" variant="page" />
      <View style={{ minHeight: 130, position: 'relative', justifyContent: 'center' }}>
        <View style={{ maxWidth: '62%', gap: 8 }}><Text style={{ fontSize: 9, letterSpacing: 1.3, color: palette.brandStrong }}>A HOME FOR EVERYTHING</Text><Text style={{ fontSize: 25, lineHeight: 38, fontWeight: '600', color: palette.text }}>记得拥有，{ '\n' }也记得归处。</Text></View>
        <Image accessible={false} source={require('../../../../../packages/ui/src/assets/category-presets/location-apartment.png')} resizeMode="contain" style={{ position: 'absolute', right: 0, top: 0, width: 136, height: 136 }} />
      </View>
      <View style={{ backgroundColor: palette.surface, borderRadius: 20, borderWidth: 1, borderColor: palette.border, padding: 20, gap: 16 }}>
        <Text style={{ fontSize: 22, lineHeight: 30, fontWeight: '600', color: palette.text }}>{title}</Text>
        {children as never}
      </View>
    </Screen>
  </KeyboardAvoidingView>;
}
