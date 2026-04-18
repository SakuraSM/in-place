import type { ReactNode } from 'react';
import { SafeAreaView, ScrollView, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { palette } from './theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  scrollProps?: ScrollViewProps;
}

export function Screen({ children, scroll = false, contentStyle, scrollProps }: ScreenProps) {
  const containerStyle: ViewStyle = {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  };

  if (scroll) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}>
        <View style={backgroundChromeStyle}>
          <View style={topGlowStyle} />
          <View style={sideGlowStyle} />
        </View>
        <ScrollView contentContainerStyle={[containerStyle, contentStyle]} {...scrollProps}>
          {children as never}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}>
      <View style={backgroundChromeStyle}>
        <View style={topGlowStyle} />
        <View style={sideGlowStyle} />
      </View>
      <View style={[containerStyle, { flex: 1 }, contentStyle]}>{children as never}</View>
    </SafeAreaView>
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
  top: -90,
  right: -40,
  width: 220,
  height: 220,
  borderRadius: 999,
  backgroundColor: '#dbeafe',
  opacity: 0.65,
};

const sideGlowStyle = {
  position: 'absolute' as const,
  left: -60,
  top: 180,
  width: 180,
  height: 180,
  borderRadius: 999,
  backgroundColor: '#e0f2fe',
  opacity: 0.45,
};
