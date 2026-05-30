import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { palette, shadows } from './theme';

interface BulkActionBarProps {
  selectedCount: number;
  bottom: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function BulkActionBar({ selectedCount, bottom, onEdit, onDelete }: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <View style={[barStyle, { bottom }]}>
      <View style={headerStyle}>
        <Text style={titleStyle}>已选择 {selectedCount} 项</Text>
      </View>
      <View style={buttonRowStyle}>
        <Pressable accessibilityRole="button" accessibilityLabel="批量编辑" onPress={onEdit} style={editButtonStyle}>
          <Ionicons name="create-outline" size={16} color="#ffffff" />
          <Text style={editButtonTextStyle}>批量编辑</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="批量删除" onPress={onDelete} style={deleteButtonStyle}>
          <Ionicons name="trash-outline" size={16} color={palette.danger} />
          <Text style={deleteButtonTextStyle}>批量删除</Text>
        </Pressable>
      </View>
    </View>
  );
}

const barStyle = {
  position: 'absolute' as const,
  left: 16,
  right: 16,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  padding: 12,
  ...shadows.lg,
};

const headerStyle = {
  paddingHorizontal: 4,
  paddingBottom: 10,
};

const titleStyle = {
  fontSize: 14,
  fontWeight: '800' as const,
  color: palette.text,
};

const buttonRowStyle = {
  flexDirection: 'row' as const,
  gap: 10,
};

const editButtonStyle = {
  flex: 1,
  minHeight: 46,
  borderRadius: 16,
  backgroundColor: palette.brand,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
};

const editButtonTextStyle = {
  fontSize: 14,
  fontWeight: '800' as const,
  color: '#ffffff',
};

const deleteButtonStyle = {
  flex: 1,
  minHeight: 46,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#fecdd3',
  backgroundColor: '#fff1f2',
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
};

const deleteButtonTextStyle = {
  fontSize: 14,
  fontWeight: '800' as const,
  color: palette.danger,
};
