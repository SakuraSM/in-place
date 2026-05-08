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
    ? { horizontal: 18, vertical: 12, gap: 14 }
    : contentInsetMode === 'form'
      ? { horizontal: 20, vertical: 16, gap: 16 }
      : { horizontal: 20, vertical: 18, gap: 16 };
  const topPadding = safeAreaTop === 'top-safe' ? insets.top + 10 : 0;
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
        <ScrollView contentContainerStyle={[containerStyle, contentStyle]} {...scrollProps}>
          {children as never}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: palette.canvas }}>
      <StatusBar barStyle={statusBarStyle} translucent backgroundColor="transparent" />
      <BackgroundChrome chrome={chrome} />
      <View style={[containerStyle, { flex: 1 }, contentStyle]}>{children as never}</View>
    </SafeAreaView>
  );
}

function BackgroundChrome({ chrome }: { chrome: 'default' | 'muted' | 'none' }) {
  if (chrome === 'none') {
    return null;
  }

  return (
    <View style={backgroundChromeStyle}>
      <View style={[topGlowStyle, chrome === 'muted' ? mutedTopGlowStyle : null]} />
      <View style={[sideGlowStyle, chrome === 'muted' ? mutedSideGlowStyle : null]} />
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
  top: -72,
  right: -28,
  width: 210,
  height: 210,
  borderRadius: 999,
  backgroundColor: '#d8f1f5',
  opacity: 0.52,
};

const sideGlowStyle = {
  position: 'absolute' as const,
  left: -54,
  top: 164,
  width: 156,
  height: 156,
  borderRadius: 999,
  backgroundColor: '#e8f7fb',
  opacity: 0.34,
};

const mutedTopGlowStyle = {
  opacity: 0.28,
};

const mutedSideGlowStyle = {
  opacity: 0.2,
};
