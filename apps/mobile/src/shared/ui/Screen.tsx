import type { ReactNode } from 'react';
import { ScrollView, StatusBar, View, type ScrollViewProps, type StatusBarStyle, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from './theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  scrollProps?: ScrollViewProps;
  safeAreaTop?: 'top-safe' | 'immersive';
  safeAreaBottom?: 'bottom-safe' | 'none';
  statusBarStyle?: StatusBarStyle;
  contentInsetMode?: 'page' | 'tight' | 'form';
  chrome?: 'default' | 'muted' | 'none';
}

export function Screen({
  children,
  scroll = false,
  contentStyle,
  scrollProps,
  safeAreaTop = 'top-safe',
  safeAreaBottom = 'bottom-safe',
  statusBarStyle = 'dark-content',
  contentInsetMode = 'page',
  chrome = 'default',
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const contentSpacing = contentInsetMode === 'tight'
    ? { horizontal: 16, vertical: 8, gap: 10 }
    : contentInsetMode === 'form'
      ? { horizontal: 16, vertical: 12, gap: 12 }
      : { horizontal: 16, vertical: 12, gap: 12 };
  const topPadding = safeAreaTop === 'top-safe' ? insets.top + 6 : 0;
  const bottomPadding = safeAreaBottom === 'bottom-safe' ? Math.max(insets.bottom, 10) : 0;
  const containerStyle: ViewStyle = {
    flexGrow: 1,
    paddingHorizontal: contentSpacing.horizontal,
    paddingTop: topPadding + contentSpacing.vertical,
    paddingBottom: bottomPadding + contentSpacing.vertical,
    gap: contentSpacing.gap,
  };

  if (scroll) {
    return (
      <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: palette.canvas }}>
        <StatusBar barStyle={statusBarStyle} translucent backgroundColor="transparent" />
        <BackgroundChrome chrome={chrome} />
        <ScrollView
          testID="screen-scroll"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[containerStyle, contentStyle]}
          {...scrollProps}
        >
          {children as never}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <StatusBar barStyle={statusBarStyle} translucent backgroundColor="transparent" />
      <BackgroundChrome chrome={chrome} />
      <View testID="screen-content" style={[containerStyle, { flex: 1 }, contentStyle]}>{children as never}</View>
    </SafeAreaView>
  );
}

function BackgroundChrome({ chrome }: { chrome: 'default' | 'muted' | 'none' }) {
  if (chrome === 'none' || chrome === 'muted') {
    return null;
  }

  return (
    <View style={backgroundChromeStyle}>
      <View style={topGlowStyle} />
    </View>
  );
}

const backgroundChromeStyle = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const topGlowStyle = {
  position: 'absolute' as const,
  top: -92,
  right: -82,
  width: 164,
  height: 164,
  borderRadius: 999,
  backgroundColor: '#dff7f4',
  opacity: 0.16,
};
