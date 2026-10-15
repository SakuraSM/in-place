import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { itemsApi } from '@/shared/api/mobileClient';
import { useHousehold } from '@/providers/HouseholdProvider';
import { formatMobileLocationPath } from '@/features/inventory/mobileInventoryFormat';
import { LocationHierarchyPicker } from './LocationHierarchyPicker';
import { palette } from '@/shared/ui/theme';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { FormField } from '@/shared/ui/FormField';
import { buildLocationCandidates, filterLocationCandidates } from '@inplace/app-core';

interface LocationSelectFieldProps {
  disabled?: boolean;
  userId?: string;
  selectedParentId: string | null;
  excludedIds?: string[];
  onChange: (parentId: string | null) => void;
}

export function LocationSelectField({
  disabled = false,
  userId,
  selectedParentId,
  excludedIds = [],
  onChange,
}: LocationSelectFieldProps) {
  const { currentHouseholdId } = useHousehold();
  const [isOpen, setIsOpen] = useState(false);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Item[]>([]);
  const [query, setQuery] = useState('');

  const selectedPathQuery = useQuery({
    queryKey: ['mobile', 'location-picker-path', currentHouseholdId, selectedParentId],
    enabled: Boolean(selectedParentId),
    queryFn: async () => {
      const ancestors = await itemsApi.fetchAncestors(selectedParentId!);
      return formatLocationPath(ancestors);
    },
  });

  const inventory = useQuery({
    queryKey: ['mobile', 'overview-all-items', currentHouseholdId, userId],
    enabled: isOpen && Boolean(userId),
    staleTime: 60_000,
    queryFn: () => itemsApi.searchItems('', userId!),
  });
  const candidates = buildLocationCandidates(inventory.data ?? [], excludedIds);
  const containers = candidates.filter(({ item }) => item.parent_id === currentParentId).map(({ item }) => item);
  const results = filterLocationCandidates(candidates, query);
  const selectedLabel = selectedParentId ? selectedPathQuery.data ?? (selectedPathQuery.isError ? '位置加载失败，点击重新选择' : '加载收纳位置…') : '未选择收纳位置';
  const close = () => { setIsOpen(false); setQuery(''); setCurrentParentId(null); setBreadcrumbs([]); };

  const handleSelect = (parentId: string | null) => {
    if (parentId && !candidates.some(({ item }) => item.id === parentId)) return;
    onChange(parentId);
    close();
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
      <Pressable accessibilityRole="button" accessibilityLabel="选择收纳位置" accessibilityState={{ disabled }} disabled={disabled} onPress={() => setIsOpen(true)} style={fieldButtonStyle}>
        <Ionicons name="location-outline" size={17} color={palette.brand} />
        <Text numberOfLines={1} style={fieldButtonTextStyle}>{selectedLabel}</Text>
        <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
      </Pressable>

      <BottomSheet visible={isOpen} title="选择收纳位置" onClose={close}>
        <FormField label="搜索收纳位置" placeholder="位置名称或路径" value={query} onChangeText={setQuery} returnKeyType="search" />
        {inventory.isError ? <Pressable accessibilityRole="button" onPress={() => void inventory.refetch()}><Text style={{ color: palette.danger }}>位置加载失败，点击重试</Text></Pressable>
          : query.trim() ? <>
            {inventory.isLoading ? <Text>加载位置中…</Text> : null}
            {!inventory.isLoading && results.length === 0 ? <Text>没有匹配的位置，试试上级位置名称</Text> : null}
            {results.map(({ item, path }) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`选择${path}`} onPress={() => handleSelect(item.id)} style={[fieldButtonStyle, { paddingVertical: 12 }]}>
              <View style={{ flex: 1, gap: 4 }}><Text style={fieldButtonTextStyle}>{item.name}</Text><Text style={{ color: palette.textSoft, fontSize: 12 }}>{path}</Text></View>
              {selectedParentId === item.id ? <Ionicons name="checkmark" size={18} color={palette.brand} /> : null}
            </Pressable>)}
          </> : <LocationHierarchyPicker
            breadcrumbs={breadcrumbs}
            containers={containers}
            currentParentId={currentParentId}
            selectedParentId={selectedParentId}
            selectedParentPath={selectedLabel}
            isLoading={inventory.isLoading}
            onSelect={handleSelect}
            onNavigate={handleNavigate}
            onDrillDown={(container) => { setBreadcrumbs((current) => [...current, container]); setCurrentParentId(container.id); }}
          />}
      </BottomSheet>
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
