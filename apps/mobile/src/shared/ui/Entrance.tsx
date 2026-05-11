import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface EntranceProps {
  children: ReactNode;
  delay?: number;
  offset?: number;
  variant?: 'page' | 'card' | 'lift' | 'none';
  staggerIndex?: number;
  reducedMotion?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_CONFIG = {
  page: { offset: 8, scale: 0.998, duration: 180 },
  card: { offset: 10, scale: 0.992, duration: 190 },
  lift: { offset: 8, scale: 0.995, duration: 170 },
  none: { offset: 0, scale: 1, duration: 0 },
} as const;

const STAGGER_DELAY_MS = 28;
const MAX_ENTRANCE_DELAY_MS = 80;
const MIN_FADE_DURATION_MS = 140;

function getEffectiveDelay(delay: number, staggerIndex: number) {
  return Math.min(delay * 0.45 + staggerIndex * STAGGER_DELAY_MS, MAX_ENTRANCE_DELAY_MS);
}

export function Entrance({
  children,
  delay = 0,
  offset,
  variant = 'card',
  staggerIndex = 0,
  reducedMotion = false,
  style,
}: EntranceProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(offset ?? VARIANT_CONFIG[variant].offset);
  const scale = useSharedValue(VARIANT_CONFIG[variant].scale);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) {
          setPrefersReducedMotion(enabled);
        }
      })
      .catch(() => {
        if (active) {
          setPrefersReducedMotion(false);
        }
      });

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => {
      setPrefersReducedMotion(enabled);
    });

    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    const shouldReduceMotion = reducedMotion || prefersReducedMotion || variant === 'none';
    const effectiveDelay = getEffectiveDelay(delay, staggerIndex);
    const targetDuration = VARIANT_CONFIG[variant].duration;

    if (shouldReduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      scale.value = 1;
      return;
    }

    opacity.value = 0;
    translateY.value = offset ?? VARIANT_CONFIG[variant].offset;
    scale.value = VARIANT_CONFIG[variant].scale;

    opacity.value = withDelay(
      effectiveDelay,
      withTiming(1, {
        duration: Math.max(MIN_FADE_DURATION_MS, targetDuration - 20),
        easing: Easing.out(Easing.cubic),
      }),
    );
    translateY.value = withDelay(
      effectiveDelay,
      withTiming(0, {
        duration: targetDuration,
        easing: Easing.out(Easing.cubic),
      }),
    );
    scale.value = withDelay(
      effectiveDelay,
      withTiming(1, {
        duration: targetDuration,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delay, offset, opacity, prefersReducedMotion, reducedMotion, scale, staggerIndex, translateY, variant]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        style,
        animatedStyle,
      ]}
    >
      {children as never}
    </Animated.View>
  );
}
