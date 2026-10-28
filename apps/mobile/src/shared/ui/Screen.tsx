import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, View, type ScrollViewProps, type StatusBarStyle, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '@inplace/ui/mobile';
import { palette } from './theme';

interface ScreenProps {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  scrollProps?: ScrollViewProps;
  safeAreaTop?: 'top-safe' | 'immersive';
  safeAreaBottom?: 'bottom-safe' | 'none';
  statusBarStyle?: StatusBarStyle;
  contentInsetMode?: 'page' | 'tight' | 'form';
  chrome?: 'default' | 'muted' | 'none';
}

export function Screen({ children, footer, scroll = false, contentStyle, scrollProps, safeAreaTop = 'top-safe', safeAreaBottom = 'bottom-safe', statusBarStyle = 'dark-content', contentInsetMode = 'page' }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const isTight = contentInsetMode === 'tight';
  const verticalSpacing = isTight ? 12 : 20;
  const topInset = safeAreaTop === 'top-safe' ? insets.top : 0;
  const topPadding = safeAreaTop === 'top-safe' ? 6 : 0;
  const bottomPadding = !footer && safeAreaBottom === 'bottom-safe' ? Math.max(insets.bottom, 10) : 0;
  const containerStyle: ViewStyle = {
    flexGrow: 1,
    paddingHorizontal: layout.pageGutter.mobile,
    paddingTop: topPadding + verticalSpacing,
    paddingBottom: bottomPadding + verticalSpacing,
    gap: isTight ? 16 : layout.pageGap.mobile,
  };
  const content = scroll ? (
    <ScrollView testID="screen-scroll" keyboardShouldPersistTaps="handled" contentContainerStyle={[containerStyle, contentStyle]} {...scrollProps}>{children as never}</ScrollView>
  ) : (
    <View testID="screen-content" style={[containerStyle, { flex: 1 }, contentStyle]}>{children as never}</View>
  );
  return (
    <SafeAreaView testID="screen-safe-area" edges={[]} style={{ flex: 1, paddingTop: topInset, backgroundColor: palette.canvas }}>
      <StatusBar barStyle={statusBarStyle} translucent backgroundColor="transparent" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' && footer ? 'padding' : undefined}>
        {content}
        {footer ? <ScreenFooter bottomInset={insets.bottom}>{footer}</ScreenFooter> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface ScreenFooterProps { children: ReactNode; bottomInset: number }
function ScreenFooter({ children, bottomInset }: ScreenFooterProps) {
  return <View testID="screen-footer" style={{ paddingHorizontal: layout.pageGutter.mobile, paddingTop: 14, paddingBottom: Math.max(bottomInset, 14), borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.surface }}>{children as never}</View>;
}
