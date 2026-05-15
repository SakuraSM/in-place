import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { getContainerTypeLabel } from '@/shared/lib/location';
import { palette } from '@/shared/ui/theme';

interface LocationHierarchyPickerProps {
  breadcrumbs: Item[];
  containers: Item[];
  currentParentId: string | null;
  selectedParentId: string | null;
  selectedParentPath: string;
  isLoading?: boolean;
  emptyText?: string;
  onSelect: (parentId: string | null) => void;
  onDrillDown: (container: Item) => void;
  onNavigate: (index: number) => void;
}

export function LocationHierarchyPicker({
  breadcrumbs,
  containers,
  currentParentId,
  selectedParentId,
  selectedParentPath,
  isLoading = false,
  emptyText = '暂无下级位置或收纳',
  onSelect,
  onDrillDown,
  onNavigate,
}: LocationHierarchyPickerProps) {
  return (
    <View style={pickerStyle}>
      <View style={selectedSummaryStyle}>
        <Ionicons name="location-outline" size={15} color={palette.brand} />
        <Text numberOfLines={1} style={selectedTextStyle}>{selectedParentPath}</Text>
      </View>

      {breadcrumbs.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={breadcrumbRailStyle}>
          <Pressable onPress={() => onNavigate(-1)} style={breadcrumbHomeStyle}>
            <Ionicons name="home-outline" size={13} color={palette.brand} />
          </Pressable>
          {breadcrumbs.map((breadcrumb, index) => (
            <Pressable key={breadcrumb.id} onPress={() => onNavigate(index)} style={breadcrumbChipStyle}>
              {index > 0 ? <Ionicons name="chevron-forward" size={11} color={palette.textSoft} /> : null}
              <Text numberOfLines={1} style={breadcrumbTextStyle}>{breadcrumb.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Pressable
        onPress={() => onSelect(currentParentId)}
        style={[locationRowStyle, selectedParentId === currentParentId ? selectedRowStyle : null]}
      >
        <Ionicons name="home-outline" size={16} color={palette.textSoft} />
        <Text style={locationTextStyle}>{currentParentId ? '放在当前位置' : '不设置收纳位置'}</Text>
        {selectedParentId === currentParentId ? <Ionicons name="checkmark" size={17} color={palette.brand} /> : null}
      </Pressable>

      {isLoading ? (
        <View style={loadingStyle}>
          <ActivityIndicator color={palette.brand} />
        </View>
      ) : containers.length === 0 ? (
        <Text style={emptyTextStyle}>{emptyText}</Text>
      ) : (
        containers.map((container) => (
          <View key={container.id} style={rowGroupStyle}>
            <Pressable
              onPress={() => onSelect(container.id)}
              style={[
                locationRowStyle,
                rowMainStyle,
                selectedParentId === container.id ? selectedRowStyle : null,
              ]}
            >
              <Ionicons name="cube-outline" size={16} color={palette.textSoft} />
              <Text numberOfLines={1} style={locationTextStyle}>{container.name}</Text>
              <Text style={typePillStyle}>{getContainerTypeLabel(container)}</Text>
              {selectedParentId === container.id ? <Ionicons name="checkmark" size={17} color={palette.brand} /> : null}
            </Pressable>
            <Pressable onPress={() => onDrillDown(container)} style={drillButtonStyle}>
              <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

const pickerStyle = {
  gap: 8,
};

const selectedSummaryStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: '#bae6fd',
  backgroundColor: '#f0f9ff',
  paddingHorizontal: 10,
  paddingVertical: 9,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 7,
};

const selectedTextStyle = {
  flex: 1,
  minWidth: 0,
  color: palette.brandStrong,
  fontSize: 13,
  fontWeight: '800' as const,
};

const breadcrumbRailStyle = {
  gap: 6,
  paddingVertical: 1,
};

const breadcrumbHomeStyle = {
  width: 28,
  height: 28,
  borderRadius: 999,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: '#e0f2fe',
};

const breadcrumbChipStyle = {
  minHeight: 28,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 9,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 4,
};

const breadcrumbTextStyle = {
  maxWidth: 110,
  color: palette.textMuted,
  fontSize: 12,
  fontWeight: '700' as const,
};

const locationRowStyle = {
  minHeight: 44,
  borderRadius: 13,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 10,
  paddingVertical: 8,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};

const selectedRowStyle = {
  borderColor: '#bae6fd',
  backgroundColor: '#eff6ff',
};

const locationTextStyle = {
  flex: 1,
  minWidth: 0,
  color: palette.text,
  fontSize: 14,
  fontWeight: '800' as const,
};

const loadingStyle = {
  minHeight: 72,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const emptyTextStyle = {
  color: palette.textSoft,
  fontSize: 13,
  lineHeight: 18,
  paddingVertical: 8,
};

const rowGroupStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
};

const rowMainStyle = {
  flex: 1,
};

const typePillStyle = {
  flexShrink: 0,
  overflow: 'hidden' as const,
  borderRadius: 999,
  backgroundColor: '#e0f2fe',
  paddingHorizontal: 7,
  paddingVertical: 3,
  color: palette.brandStrong,
  fontSize: 11,
  fontWeight: '800' as const,
};

const drillButtonStyle = {
  width: 38,
  height: 44,
  borderRadius: 13,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surfaceMuted,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
