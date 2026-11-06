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

const TIGHT_SCREEN_VERTICAL_SPACING = 12;
const DEFAULT_SCREEN_VERTICAL_SPACING = 20;
const TIGHT_SCREEN_GAP = 16;
const SAFE_TOP_EXTRA_PADDING = 6;
const MIN_SAFE_BOTTOM_PADDING = 10;
const FOOTER_VERTICAL_PADDING = 14;

export function Screen({ children, footer, scroll = false, contentStyle, scrollProps, safeAreaTop = 'top-safe', safeAreaBottom = 'bottom-safe', statusBarStyle = 'dark-content', contentInsetMode = 'page' }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const isTight = contentInsetMode === 'tight';
  const verticalSpacing = isTight ? TIGHT_SCREEN_VERTICAL_SPACING : DEFAULT_SCREEN_VERTICAL_SPACING;
  const topInset = safeAreaTop === 'top-safe' ? insets.top : 0;
  const topPadding = safeAreaTop === 'top-safe' ? SAFE_TOP_EXTRA_PADDING : 0;
  const bottomPadding = !footer && safeAreaBottom === 'bottom-safe' ? Math.max(insets.bottom, MIN_SAFE_BOTTOM_PADDING) : 0;
  const containerStyle: ViewStyle = {
    flexGrow: 1,
    paddingHorizontal: layout.pageGutter.mobile,
    paddingTop: topPadding + verticalSpacing,
    paddingBottom: bottomPadding + verticalSpacing,
    gap: isTight ? TIGHT_SCREEN_GAP : layout.pageGap.mobile,
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

interface ScreenFooterProps { children: ReactNode; bottomInset?: number }
export function ScreenFooter({ children, bottomInset = 0 }: ScreenFooterProps) {
  return <View testID="screen-footer" style={{ paddingHorizontal: layout.pageGutter.mobile, paddingTop: FOOTER_VERTICAL_PADDING, paddingBottom: Math.max(bottomInset, FOOTER_VERTICAL_PADDING), borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.surface }}>{children as never}</View>;
}
