import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, shadows } from './theme';

interface BottomSheetProps {
  children: ReactNode;
  title: string;
  visible: boolean;
  onClose: () => void;
}

export function BottomSheet({ children, title, visible, onClose }: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={rootStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`关闭${title}`}
          onPress={onClose}
          style={backdropStyle}
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={[sheetStyle, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <View style={handleStyle} />
          <View style={headerStyle}>
            <Text accessibilityRole="header" style={titleStyle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`关闭${title}`}
              hitSlop={10}
              onPress={onClose}
              style={closeStyle}
            >
              <Ionicons name="close" size={20} color={palette.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={contentStyle}
          >
            {children as never}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const rootStyle = {
  flex: 1,
  justifyContent: 'flex-end' as const,
};

const backdropStyle = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.44)',
};

const sheetStyle = {
  maxHeight: '88%' as const,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  borderWidth: 1,
  borderBottomWidth: 0,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  ...shadows.card,
};

const handleStyle = {
  alignSelf: 'center' as const,
  width: 42,
  height: 5,
  borderRadius: 3,
  backgroundColor: palette.border,
  marginTop: 9,
};

const headerStyle = {
  minHeight: 58,
  paddingHorizontal: 18,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 12,
};

const titleStyle = {
  flex: 1,
  fontSize: 20,
  fontWeight: '900' as const,
  color: palette.text,
};

const closeStyle = {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: palette.surfaceMuted,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const contentStyle = {
  gap: 12,
  paddingHorizontal: 18,
  paddingBottom: 20,
};
