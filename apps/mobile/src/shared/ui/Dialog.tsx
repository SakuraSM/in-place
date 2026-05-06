import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { palette, shadows } from './theme';

interface DialogProps {
  visible: boolean;
  onClose: () => void;
  /** 标题（可选）。若不传则不展示标题区。 */
  title?: string;
  /** 正文文案（可选），与 children 二选一即可。 */
  message?: string;
  children?: ReactNode;
  /** 自定义底部按钮区。若不传，使用默认的「取消 / 确认」按钮。 */
  footer?: ReactNode;
  /** 默认底部按钮：确认按钮文案。 */
  confirmLabel?: string;
  /** 默认底部按钮：取消按钮文案，传 null 可隐藏取消按钮。 */
  cancelLabel?: string | null;
  /** 默认底部按钮：点击确认时触发。 */
  onConfirm?: () => void;
  /** 默认底部按钮：是否使用危险操作（红色）样式。 */
  danger?: boolean;
  /** 是否可点击遮罩关闭，默认 true。 */
  dismissOnBackdrop?: boolean;
  /** 卡片自定义样式。 */
  cardStyle?: ViewStyle;
}

/**
 * 统一弹窗样式：半透明遮罩 + 圆角白卡 + 弹簧/缓出入场动画。
 * 与 web 端 `ConfirmDialog` 视觉与节奏对齐，整个移动端的弹窗都应使用此组件。
 */
export function Dialog({
  visible,
  onClose,
  title,
  message,
  children,
  footer,
  confirmLabel = '确认',
  cancelLabel = '取消',
  onConfirm,
  danger = false,
  dismissOnBackdrop = true,
  cardStyle,
}: DialogProps) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardTranslate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      overlayOpacity.setValue(0);
      cardOpacity.setValue(0);
      cardScale.setValue(0.92);
      cardTranslate.setValue(12);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(cardOpacity, {
          toValue: 1,
          stiffness: 320,
          damping: 24,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          stiffness: 320,
          damping: 24,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslate, {
          toValue: 0,
          stiffness: 320,
          damping: 24,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, overlayOpacity, cardOpacity, cardScale, cardTranslate]);

  const handleConfirm = () => {
    onConfirm?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissOnBackdrop ? onClose : undefined}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.card,
            shadows.card,
            cardStyle,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }, { translateY: cardTranslate }],
            },
          ]}
        >
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children as never}
          {footer ? (
            <View style={styles.footer}>{footer as never}</View>
          ) : (
            <View style={styles.footer}>
              {cancelLabel === null ? null : (
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.button,
                    styles.cancelButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleConfirm}
                style={({ pressed }) => [
                  styles.button,
                  danger ? styles.dangerButton : styles.confirmButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: palette.surface,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.textSoft,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: palette.brand,
  },
  dangerButton: {
    backgroundColor: '#f43f5e',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
