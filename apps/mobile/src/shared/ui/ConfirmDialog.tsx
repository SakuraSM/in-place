import { Modal, Pressable, Text, View } from 'react-native';
import { palette, shadows } from './theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = '取消',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={overlayStyle}>
        <View style={dialogStyle}>
          <View style={{ gap: 8 }}>
            <Text style={titleStyle}>{title}</Text>
            <Text style={messageStyle}>{message}</Text>
          </View>

          <View style={actionRowStyle}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onCancel}
              style={[secondaryButtonStyle, loading ? disabledButtonStyle : null]}
            >
              <Text style={secondaryButtonTextStyle}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onConfirm}
              style={[
                primaryButtonStyle,
                danger ? dangerButtonStyle : null,
                loading ? disabledButtonStyle : null,
              ]}
            >
              <Text style={primaryButtonTextStyle}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const overlayStyle = {
  flex: 1,
  justifyContent: 'center' as const,
  backgroundColor: 'rgba(15, 23, 42, 0.42)',
  padding: 24,
};

const dialogStyle = {
  gap: 20,
  borderRadius: 28,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  padding: 22,
  ...shadows.card,
};

const titleStyle = {
  fontSize: 20,
  fontWeight: '800' as const,
  color: palette.text,
};

const messageStyle = {
  fontSize: 15,
  lineHeight: 22,
  color: palette.textMuted,
};

const actionRowStyle = {
  flexDirection: 'row' as const,
  gap: 12,
};

const secondaryButtonStyle = {
  flex: 1,
  alignItems: 'center' as const,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  paddingVertical: 13,
};

const primaryButtonStyle = {
  flex: 1,
  alignItems: 'center' as const,
  borderRadius: 16,
  backgroundColor: palette.brand,
  paddingVertical: 13,
};

const dangerButtonStyle = {
  backgroundColor: palette.danger,
};

const disabledButtonStyle = {
  opacity: 0.55,
};

const secondaryButtonTextStyle = {
  color: palette.text,
  fontSize: 15,
  fontWeight: '700' as const,
};

const primaryButtonTextStyle = {
  color: '#ffffff',
  fontSize: 15,
  fontWeight: '700' as const,
};
