import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, shadows } from './theme';

export type NotificationTone = 'success' | 'error' | 'info' | 'loading';

export interface NotificationInput {
  tone: NotificationTone;
  title: string;
  description?: string;
  durationMs?: number;
}

interface NotificationRecord extends NotificationInput {
  id: number;
}

interface ToastContextValue {
  notify: (notification: NotificationInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const DEFAULT_DURATION_MS = 3200;

const TONE_ICONS: Record<NotificationTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  loading: 'hourglass',
};

const TONE_COLORS: Record<NotificationTone, string> = {
  success: palette.brandStrong,
  error: palette.danger,
  info: palette.brandStrong,
  loading: palette.textMuted,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [notification, setNotification] = useState<NotificationRecord | null>(null);
  const nextIdRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setNotification(null);
  }, []);

  const notify = useCallback((input: NotificationInput) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const nextNotification = { ...input, id: nextIdRef.current };
    nextIdRef.current += 1;
    setNotification(nextNotification);

    if (input.tone !== 'loading') {
      timerRef.current = setTimeout(dismiss, input.durationMs ?? DEFAULT_DURATION_MS);
    }
  }, [dismiss]);

  const contextValue = useMemo(() => ({ notify }), [notify]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {notification ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[toastStyle, { top: insets.top + 10 }]}
        >
          <Ionicons
            name={TONE_ICONS[notification.tone]}
            size={23}
            color={TONE_COLORS[notification.tone]}
          />
          <View style={toastTextStyle}>
            <Text style={toastTitleStyle}>{notification.title}</Text>
            {notification.description ? (
              <Text style={toastDescriptionStyle}>{notification.description}</Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭通知"
            hitSlop={10}
            onPress={dismiss}
          >
            <Ionicons name="close" size={18} color={palette.textSoft} />
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useNotify() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useNotify must be used inside ToastProvider');
  }
  return context.notify;
}

const toastStyle = {
  position: 'absolute' as const,
  zIndex: 100,
  left: 16,
  right: 16,
  minHeight: 58,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  paddingHorizontal: 14,
  paddingVertical: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  ...shadows.card,
};

const toastTextStyle = {
  flex: 1,
  gap: 2,
};

const toastTitleStyle = {
  fontSize: 14,
  fontWeight: '900' as const,
  color: palette.text,
};

const toastDescriptionStyle = {
  fontSize: 12,
  lineHeight: 17,
  color: palette.textMuted,
};
