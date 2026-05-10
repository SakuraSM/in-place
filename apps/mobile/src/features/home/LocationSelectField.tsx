import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { itemsApi } from '@/shared/api/mobileClient';
import { getContainerTypeLabel } from '@/shared/lib/location';
import { palette, shadows } from '@/shared/ui/theme';

interface LocationSelectFieldProps {
  userId?: string;
  selectedParentId: string | null;
  excludedIds?: string[];
  onChange: (parentId: string | null) => void;
}

export function LocationSelectField({
  userId,
  selectedParentId,
  excludedIds = [],
  onChange,
}: LocationSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Item[]>([]);
  const excludedIdSet = useMemo(() => new Set(excludedIds), [excludedIds]);

  const selectedPathQuery = useQuery({
    queryKey: ['mobile', 'location-picker-path', selectedParentId],
    enabled: Boolean(selectedParentId),
    queryFn: async () => {
      const ancestors = await itemsApi.fetchAncestors(selectedParentId!);
      return formatLocationPath(ancestors);
    },
  });

  const currentContainersQuery = useQuery({
    queryKey: ['mobile', 'location-picker-children', userId, currentParentId],
    enabled: isOpen && Boolean(userId),
    queryFn: async () => {
      const children = await itemsApi.fetchChildren(currentParentId, userId!);
      return children.filter((item) => item.type === 'container' && !excludedIdSet.has(item.id));
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setCurrentParentId(null);
      setBreadcrumbs([]);
    }
  }, [isOpen]);

  const selectedLabel = selectedParentId ? selectedPathQuery.data ?? '加载位置...' : '顶层位置';
  const containers = currentContainersQuery.data ?? [];

  const handleSelect = (parentId: string | null) => {
    onChange(parentId);
    setIsOpen(false);
  };

  const handleNavigate = (index: number) => {
    if (index < 0) {
      setBreadcrumbs([]);
      setCurrentParentId(null);
      return;
    }

    const target = breadcrumbs[index];
    setBreadcrumbs((current) => current.slice(0, index + 1));
    setCurrentParentId(target.id);
  };

  return (
    <>
      <Pressable onPress={() => setIsOpen(true)} style={fieldButtonStyle}>
        <Ionicons name="location-outline" size={17} color={palette.brand} />
        <Text numberOfLines={1} style={fieldButtonTextStyle}>{selectedLabel}</Text>
        <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <View style={modalRootStyle}>
          <Pressable style={backdropStyle} onPress={() => setIsOpen(false)} />
          <View style={sheetStyle}>
            <View style={dragHandleStyle} />
            <View style={sheetHeaderStyle}>
              <Text style={sheetTitleStyle}>选择位置</Text>
              <Pressable onPress={() => setIsOpen(false)} style={closeButtonStyle}>
                <Ionicons name="close" size={18} color={palette.textMuted} />
              </Pressable>
            </View>

            <View style={selectedSummaryStyle}>
              <Ionicons name="location-outline" size={16} color={palette.brand} />
              <Text numberOfLines={1} style={selectedSummaryTextStyle}>{selectedLabel}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={breadcrumbRailStyle}>
              <Pressable onPress={() => handleNavigate(-1)} style={breadcrumbChipStyle}>
                <Ionicons name="home-outline" size={13} color={palette.brand} />
                <Text style={breadcrumbChipTextStyle}>顶层</Text>
              </Pressable>
              {breadcrumbs.map((breadcrumb, index) => (
                <Pressable key={breadcrumb.id} onPress={() => handleNavigate(index)} style={breadcrumbChipStyle}>
                  <Ionicons name="chevron-forward" size={12} color={palette.textSoft} />
                  <Text numberOfLines={1} style={breadcrumbChipTextStyle}>{breadcrumb.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView contentContainerStyle={sheetContentStyle}>
              <Pressable
                onPress={() => handleSelect(currentParentId)}
                style={[locationRowStyle, selectedParentId === currentParentId ? selectedLocationRowStyle : null]}
              >
                <Ionicons name="home-outline" size={17} color={palette.textSoft} />
                <Text style={locationRowTextStyle}>{currentParentId ? '当前位置' : '顶层位置'}</Text>
                {selectedParentId === currentParentId ? <Ionicons name="checkmark" size={18} color={palette.brand} /> : null}
              </Pressable>

              {currentContainersQuery.isLoading ? (
                <View style={loadingStyle}>
                  <ActivityIndicator />
                </View>
              ) : containers.length === 0 ? (
                <Text style={emptyHintStyle}>暂无下级收纳或位置</Text>
              ) : (
                containers.map((container) => (
                  <View key={container.id} style={locationRowGroupStyle}>
                    <Pressable
                      onPress={() => handleSelect(container.id)}
                      style={[
                        locationRowStyle,
                        selectedParentId === container.id ? selectedLocationRowStyle : null,
                        locationRowMainStyle,
                      ]}
                    >
                      <Ionicons name="cube-outline" size={17} color={palette.textSoft} />
                      <Text numberOfLines={1} style={locationRowTextStyle}>{container.name}</Text>
                      <Text style={locationTypePillStyle}>{getContainerTypeLabel(container)}</Text>
                      {selectedParentId === container.id ? <Ionicons name="checkmark" size={18} color={palette.brand} /> : null}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setBreadcrumbs((current) => [...current, container]);
                        setCurrentParentId(container.id);
                      }}
                      style={drillButtonStyle}
                    >
                      <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function formatLocationPath(items: Item[]) {
  return items.length > 0 ? `顶层 > ${items.map((item) => item.name).join(' > ')}` : '顶层位置';
}

const fieldButtonStyle = {
  minHeight: 52,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
};

const fieldButtonTextStyle = {
  flex: 1,
  minWidth: 0,
  color: palette.text,
  fontSize: 15,
  fontWeight: '700' as const,
};

const modalRootStyle = {
  flex: 1,
  justifyContent: 'flex-end' as const,
};

const backdropStyle = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.28)',
};

const sheetStyle = {
  maxHeight: '78%' as const,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  backgroundColor: palette.surface,
  overflow: 'hidden' as const,
  ...shadows.lg,
};

const dragHandleStyle = {
  alignSelf: 'center' as const,
  width: 42,
  height: 4,
  borderRadius: 999,
  backgroundColor: palette.border,
  marginTop: 10,
  marginBottom: 4,
};

const sheetHeaderStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  paddingHorizontal: 20,
  paddingVertical: 14,
};

const sheetTitleStyle = {
  color: palette.text,
  fontSize: 22,
  fontWeight: '900' as const,
};

const closeButtonStyle = {
  width: 38,
  height: 38,
  borderRadius: 19,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: palette.surfaceMuted,
};

const selectedSummaryStyle = {
  marginHorizontal: 20,
  marginBottom: 10,
  borderRadius: 16,
  backgroundColor: '#f0f9ff',
  paddingHorizontal: 14,
  paddingVertical: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};

const selectedSummaryTextStyle = {
  flex: 1,
  minWidth: 0,
  color: palette.brandStrong,
  fontSize: 14,
  fontWeight: '800' as const,
};

const breadcrumbRailStyle = {
  paddingHorizontal: 20,
  paddingBottom: 10,
  gap: 8,
};

const breadcrumbChipStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 4,
  borderRadius: 999,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 10,
  paddingVertical: 7,
};

const breadcrumbChipTextStyle = {
  color: palette.textMuted,
  fontSize: 13,
  fontWeight: '700' as const,
};

const sheetContentStyle = {
  paddingHorizontal: 20,
  paddingBottom: 28,
  gap: 10,
};

const locationRowGroupStyle = {
  flexDirection: 'row' as const,
  alignItems: 'stretch' as const,
  gap: 8,
};

const locationRowStyle = {
  minHeight: 54,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'transparent',
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 9,
};

const locationRowMainStyle = {
  flex: 1,
  minWidth: 0,
};

const selectedLocationRowStyle = {
  backgroundColor: '#f0f9ff',
  borderColor: '#bae6fd',
};

const locationRowTextStyle = {
  flex: 1,
  minWidth: 0,
  color: palette.text,
  fontSize: 15,
  fontWeight: '800' as const,
};

const locationTypePillStyle = {
  borderRadius: 999,
  backgroundColor: '#e0f2fe',
  color: palette.brandStrong,
  paddingHorizontal: 8,
  paddingVertical: 3,
  fontSize: 12,
  fontWeight: '800' as const,
};

const drillButtonStyle = {
  width: 46,
  borderRadius: 16,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: palette.surfaceMuted,
};

const loadingStyle = {
  paddingVertical: 16,
};

const emptyHintStyle = {
  color: palette.textSoft,
  fontSize: 14,
  paddingVertical: 10,
};
