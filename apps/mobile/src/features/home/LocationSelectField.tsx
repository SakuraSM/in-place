import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { itemsApi } from '@/shared/api/mobileClient';
import { formatMobileLocationPath } from '@/features/inventory/mobileInventoryFormat';
import { LocationHierarchyPicker } from './LocationHierarchyPicker';
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

  const selectedLabel = selectedParentId ? selectedPathQuery.data ?? '加载收纳位置...' : '未选择收纳位置';
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
              <Text style={sheetTitleStyle}>选择收纳位置</Text>
              <Pressable onPress={() => setIsOpen(false)} style={closeButtonStyle}>
                <Ionicons name="close" size={18} color={palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={sheetContentStyle} keyboardShouldPersistTaps="handled">
              <LocationHierarchyPicker
                breadcrumbs={breadcrumbs}
                containers={containers}
                currentParentId={currentParentId}
                selectedParentId={selectedParentId}
                selectedParentPath={selectedLabel}
                isLoading={currentContainersQuery.isLoading}
                onSelect={handleSelect}
                onNavigate={handleNavigate}
                onDrillDown={(container) => {
                  setBreadcrumbs((current) => [...current, container]);
                  setCurrentParentId(container.id);
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function formatLocationPath(items: Item[]) {
  return formatMobileLocationPath(items) || '未选择收纳位置';
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

const sheetContentStyle = {
  paddingHorizontal: 20,
  paddingBottom: 28,
  gap: 10,
};
