import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Category, Item, ItemStatus } from '@inplace/domain';
import { ITEM_STATUS_PRESENTATION } from '@inplace/app-core';
import { buildChildrenMap, getContainerTypeLabel, isLocationItem } from '@/shared/lib/location';
import { palette, shadows } from '@/shared/ui/theme';

export interface BulkEditPayload {
  category?: string;
  status?: ItemStatus;
  description?: string;
  parent_id?: string | null;
  tags?: string[];
}

interface HomeBulkEditSheetProps {
  visible: boolean;
  items: Item[];
  allItems: Item[];
  categories: Category[];
  onClose: () => void;
  onSave: (payload: BulkEditPayload) => Promise<void>;
}

const STATUS_OPTIONS: ItemStatus[] = ['in_stock', 'borrowed', 'worn_out'];

export function HomeBulkEditSheet({
  visible,
  items,
  allItems,
  categories,
  onClose,
  onSave,
}: HomeBulkEditSheetProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<ItemStatus | ''>('');
  const [isDescriptionEnabled, setIsDescriptionEnabled] = useState(false);
  const [description, setDescription] = useState('');
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Item[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const selectedItemIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const childrenMap = useMemo(() => buildChildrenMap(allItems), [allItems]);
  const itemMap = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [allItems]);
  const currentContainers = useMemo(
    () => (childrenMap.get(currentParentId) ?? []).filter((item) => item.type === 'container' && !selectedItemIds.has(item.id)),
    [childrenMap, currentParentId, selectedItemIds],
  );
  const selectedParentPath = useMemo(
    () => buildParentPath(selectedParentId, itemMap),
    [itemMap, selectedParentId],
  );

  const itemType = useMemo(() => {
    if (items.length === 0) {
      return null;
    }

    const firstType = items[0].type;
    return items.every((item) => item.type === firstType) ? firstType : null;
  }, [items]);

  const availableCategories = useMemo(() => {
    if (!itemType) {
      return [];
    }

    return categories.filter((categoryItem) => categoryItem.item_type === itemType);
  }, [categories, itemType]);

  const selectedTypeLabel = useMemo(() => {
    if (itemType === 'item') {
      return '物品';
    }

    if (itemType !== 'container') {
      return '对象';
    }

    const hasLocation = items.some(isLocationItem);
    const hasStorage = items.some((item) => item.type === 'container' && !isLocationItem(item));

    if (hasLocation && hasStorage) {
      return '收纳/位置';
    }

    return getContainerTypeLabel(items[0]);
  }, [itemType, items]);

  useEffect(() => {
    if (visible) {
      setCategory('');
      setStatus('');
      setIsDescriptionEnabled(false);
      setDescription('');
      setIsLocationEnabled(false);
      setSelectedParentId(null);
      setCurrentParentId(null);
      setBreadcrumbs([]);
      setTagInput('');
      setTags([]);
    }
  }, [visible]);

  const handleAddTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag) {
      setTagInput('');
      return;
    }

    setTags((current) => (
      current.some((tag) => tag.toLocaleLowerCase('zh-CN') === nextTag.toLocaleLowerCase('zh-CN'))
        ? current
        : [...current, nextTag]
    ));
    setTagInput('');
  };

  const handleSubmit = async () => {
    const payload: BulkEditPayload = {};

    if (category) {
      payload.category = category;
    }

    if (status) {
      payload.status = status;
    }

    if (isDescriptionEnabled) {
      payload.description = description.trim();
    }

    if (isLocationEnabled) {
      payload.parent_id = selectedParentId;
    }

    if (tags.length > 0) {
      payload.tags = Array.from(new Set([...items.flatMap((item) => item.tags), ...tags]));
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(payload);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalRootStyle}>
        <Pressable style={backdropStyle} onPress={onClose} />
        <View style={sheetStyle}>
          <View style={dragHandleStyle} />
          <View style={sheetHeaderStyle}>
            <View>
              <Text style={sheetTitleStyle}>批量编辑</Text>
              <Text style={sheetSubtitleStyle}>已选择 {items.length} 个{selectedTypeLabel}</Text>
            </View>
            <Pressable disabled={isSaving} onPress={onClose} style={closeButtonStyle}>
              <Ionicons name="close" size={18} color={palette.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={sheetContentStyle} keyboardShouldPersistTaps="handled">
            {itemType ? (
              <Field label="类别">
                {availableCategories.length === 0 ? (
                  <Text style={emptyHintStyle}>当前没有可选类别。</Text>
                ) : (
                  <View style={chipWrapStyle}>
                    {availableCategories.map((categoryItem) => {
                      const isSelected = category === categoryItem.name;
                      return (
                        <Pressable
                          key={categoryItem.id}
                          onPress={() => setCategory(isSelected ? '' : categoryItem.name)}
                          style={[chipStyle, isSelected ? activeChipStyle : null]}
                        >
                          <Text style={isSelected ? activeChipTextStyle : chipTextStyle}>{categoryItem.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </Field>
            ) : (
              <View style={warningBoxStyle}>
              <Text style={warningTextStyle}>混合类型不可批量修改类别和状态。</Text>
              </View>
            )}

            {itemType === 'item' ? (
              <Field label="状态">
                <View style={chipWrapStyle}>
                  {STATUS_OPTIONS.map((option) => {
                    const isSelected = status === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setStatus(isSelected ? '' : option)}
                        style={[chipStyle, isSelected ? activeChipStyle : null]}
                      >
                        <Text style={isSelected ? activeChipTextStyle : chipTextStyle}>{ITEM_STATUS_PRESENTATION[option].label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>
            ) : null}

            <ToggleSection
              title="覆盖描述"
              enabled={isDescriptionEnabled}
              onToggle={() => setIsDescriptionEnabled((current) => !current)}
            >
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="描述"
                style={[inputStyle, multilineInputStyle]}
                multiline
              />
            </ToggleSection>

            <ToggleSection
              title="批量移动位置"
              enabled={isLocationEnabled}
              onToggle={() => setIsLocationEnabled((current) => !current)}
            >
              <LocationHierarchyPicker
                breadcrumbs={breadcrumbs}
                containers={currentContainers}
                currentParentId={currentParentId}
                selectedParentId={selectedParentId}
                selectedParentPath={selectedParentPath}
                onSelect={setSelectedParentId}
                onDrillDown={(container) => {
                  setBreadcrumbs((current) => [...current, container]);
                  setCurrentParentId(container.id);
                }}
                onNavigate={(index) => {
                  if (index < 0) {
                    setBreadcrumbs([]);
                    setCurrentParentId(null);
                    return;
                  }

                  const target = breadcrumbs[index];
                  setBreadcrumbs((current) => current.slice(0, index + 1));
                  setCurrentParentId(target.id);
                }}
              />
            </ToggleSection>

            <Field label="追加标签">
              <View style={tagInputRowStyle}>
                <TextInput
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder="添加标签"
                  style={[inputStyle, tagInputStyle]}
                  onSubmitEditing={handleAddTag}
                />
                <Pressable onPress={handleAddTag} style={tagAddButtonStyle}>
                  <Ionicons name="pricetag-outline" size={17} color={palette.brand} />
                </Pressable>
              </View>
              {tags.length > 0 ? (
                <View style={chipWrapStyle}>
                  {tags.map((tag) => (
                    <Pressable key={tag} onPress={() => setTags((current) => current.filter((value) => value !== tag))} style={activeChipStyle}>
                      <Text style={activeChipTextStyle}>{tag}  ×</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Field>
          </ScrollView>

          <View style={sheetFooterStyle}>
            <Pressable disabled={isSaving} onPress={() => void handleSubmit()} style={[saveButtonStyle, isSaving ? disabledStyle : null]}>
              {isSaving ? <ActivityIndicator color="#ffffff" /> : <Text style={saveButtonTextStyle}>批量保存</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyle}>
      <Text style={fieldLabelStyle}>{label}</Text>
      {children as never}
    </View>
  );
}

function ToggleSection({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={toggleSectionStyle}>
      <Pressable onPress={onToggle} style={toggleHeaderStyle}>
        <Text style={toggleTitleStyle}>{title}</Text>
        <View style={[checkboxStyle, enabled ? checkboxActiveStyle : null]}>
          {enabled ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
        </View>
      </Pressable>
      {enabled ? <View style={{ paddingTop: 12 }}>{children as never}</View> : null}
    </View>
  );
}

function LocationHierarchyPicker({
  breadcrumbs,
  containers,
  currentParentId,
  selectedParentId,
  selectedParentPath,
  onSelect,
  onDrillDown,
  onNavigate,
}: {
  breadcrumbs: Item[];
  containers: Item[];
  currentParentId: string | null;
  selectedParentId: string | null;
  selectedParentPath: string;
  onSelect: (parentId: string | null) => void;
  onDrillDown: (container: Item) => void;
  onNavigate: (index: number) => void;
}) {
  return (
    <View style={locationPickerStyle}>
      <View style={selectedLocationSummaryStyle}>
        <Ionicons name="location-outline" size={16} color={palette.brand} />
        <Text numberOfLines={1} style={selectedLocationTextStyle}>{selectedParentPath}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={breadcrumbRailStyle}>
        <Pressable onPress={() => onNavigate(-1)} style={breadcrumbChipStyle}>
          <Ionicons name="home-outline" size={13} color={palette.brand} />
          <Text style={breadcrumbChipTextStyle}>顶层</Text>
        </Pressable>
        {breadcrumbs.map((breadcrumb, index) => (
          <Pressable key={breadcrumb.id} onPress={() => onNavigate(index)} style={breadcrumbChipStyle}>
            <Ionicons name="chevron-forward" size={12} color={palette.textSoft} />
            <Text numberOfLines={1} style={breadcrumbChipTextStyle}>{breadcrumb.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable onPress={() => onSelect(currentParentId)} style={[locationRowStyle, selectedParentId === currentParentId ? selectedLocationRowStyle : null]}>
        <Ionicons name="home-outline" size={16} color={palette.textSoft} />
        <Text style={locationRowTextStyle}>{currentParentId ? '当前位置' : '顶层位置'}</Text>
        {selectedParentId === currentParentId ? <Ionicons name="checkmark" size={16} color={palette.brand} /> : null}
      </Pressable>

      {containers.length === 0 ? (
        <Text style={emptyHintStyle}>暂无下级收纳或位置。</Text>
      ) : (
        containers.map((container) => (
          <View key={container.id} style={locationRowGroupStyle}>
            <Pressable onPress={() => onSelect(container.id)} style={[locationRowStyle, selectedParentId === container.id ? selectedLocationRowStyle : null, locationRowMainStyle]}>
              <Ionicons name="cube-outline" size={16} color={palette.textSoft} />
              <Text numberOfLines={1} style={locationRowTextStyle}>{container.name}</Text>
              <Text style={locationTypePillStyle}>{getContainerTypeLabel(container)}</Text>
              {selectedParentId === container.id ? <Ionicons name="checkmark" size={16} color={palette.brand} /> : null}
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

function buildParentPath(parentId: string | null, itemMap: Map<string, Item>) {
  if (!parentId) {
    return '顶层位置';
  }

  const names: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null = parentId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const item = itemMap.get(currentId);
    if (!item) {
      break;
    }

    names.unshift(item.name);
    currentId = item.parent_id;
  }

  return names.length > 0 ? `顶层 > ${names.join(' > ')}` : '顶层位置';
}

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
  maxHeight: '88%' as const,
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
  paddingHorizontal: 18,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: palette.borderSoft,
};

const sheetTitleStyle = {
  fontSize: 18,
  fontWeight: '800' as const,
  color: palette.text,
};

const sheetSubtitleStyle = {
  marginTop: 3,
  fontSize: 12,
  color: palette.textSoft,
};

const closeButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 999,
  backgroundColor: palette.surfaceMuted,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const sheetContentStyle = {
  padding: 18,
  gap: 16,
};

const fieldStyle = {
  gap: 8,
};

const fieldLabelStyle = {
  fontSize: 14,
  fontWeight: '700' as const,
  color: palette.textMuted,
};

const chipWrapStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 8,
};

const chipStyle = {
  borderRadius: 999,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 12,
  paddingVertical: 8,
};

const activeChipStyle = {
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#7dd3fc',
  backgroundColor: palette.brandTint,
  paddingHorizontal: 12,
  paddingVertical: 8,
};

const chipTextStyle = {
  fontSize: 13,
  fontWeight: '600' as const,
  color: palette.textMuted,
};

const activeChipTextStyle = {
  fontSize: 13,
  fontWeight: '700' as const,
  color: palette.brandStrong,
};

const warningBoxStyle = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#fde68a',
  backgroundColor: '#fffbeb',
  padding: 13,
};

const warningTextStyle = {
  color: '#b45309',
  fontSize: 13,
  lineHeight: 18,
};

const toggleSectionStyle = {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  padding: 13,
};

const toggleHeaderStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 12,
};

const toggleTitleStyle = {
  fontSize: 14,
  fontWeight: '700' as const,
  color: palette.textMuted,
};

const checkboxStyle = {
  width: 22,
  height: 22,
  borderRadius: 7,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const checkboxActiveStyle = {
  borderColor: palette.brand,
  backgroundColor: palette.brand,
};

const inputStyle = {
  minHeight: 46,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  paddingHorizontal: 13,
  paddingVertical: 11,
  fontSize: 14,
  color: palette.text,
};

const multilineInputStyle = {
  minHeight: 82,
  textAlignVertical: 'top' as const,
};

const tagInputRowStyle = {
  flexDirection: 'row' as const,
  gap: 8,
};

const tagInputStyle = {
  flex: 1,
};

const tagAddButtonStyle = {
  width: 46,
  height: 46,
  borderRadius: 14,
  backgroundColor: palette.brandTint,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const emptyHintStyle = {
  fontSize: 13,
  color: palette.textSoft,
};

const sheetFooterStyle = {
  paddingHorizontal: 18,
  paddingTop: 12,
  paddingBottom: 18,
  borderTopWidth: 1,
  borderTopColor: palette.borderSoft,
  backgroundColor: palette.surface,
};

const saveButtonStyle = {
  minHeight: 50,
  borderRadius: 17,
  backgroundColor: palette.brand,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const saveButtonTextStyle = {
  fontSize: 15,
  fontWeight: '800' as const,
  color: '#ffffff',
};

const disabledStyle = {
  opacity: 0.55,
};

const locationPickerStyle = {
  gap: 10,
};

const selectedLocationSummaryStyle = {
  minHeight: 42,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: '#bae6fd',
  backgroundColor: '#f0f9ff',
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};

const selectedLocationTextStyle = {
  flex: 1,
  fontSize: 13,
  fontWeight: '700' as const,
  color: palette.brandStrong,
};

const breadcrumbRailStyle = {
  flexDirection: 'row' as const,
  gap: 8,
  paddingRight: 4,
};

const breadcrumbChipStyle = {
  minHeight: 30,
  borderRadius: 999,
  backgroundColor: palette.surface,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 10,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 4,
};

const breadcrumbChipTextStyle = {
  maxWidth: 120,
  fontSize: 12,
  fontWeight: '700' as const,
  color: palette.textMuted,
};

const locationRowGroupStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};

const locationRowStyle = {
  minHeight: 44,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: 'transparent',
  backgroundColor: palette.surface,
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};

const locationRowMainStyle = {
  flex: 1,
};

const selectedLocationRowStyle = {
  borderColor: '#bae6fd',
  backgroundColor: '#f0f9ff',
};

const locationRowTextStyle = {
  flex: 1,
  fontSize: 13,
  fontWeight: '700' as const,
  color: palette.text,
};

const locationTypePillStyle = {
  borderRadius: 999,
  backgroundColor: palette.brandTint,
  paddingHorizontal: 8,
  paddingVertical: 3,
  fontSize: 11,
  fontWeight: '800' as const,
  color: palette.brandStrong,
};

const drillButtonStyle = {
  width: 42,
  height: 42,
  borderRadius: 14,
  backgroundColor: palette.surface,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
