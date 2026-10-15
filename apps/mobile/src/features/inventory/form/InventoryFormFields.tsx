import { Pressable, ScrollView, Text, View, type TextInput } from 'react-native';
import type { Ref } from 'react';
import type { Category, CategoryScope, ItemStatus, TrackingMode } from '@inplace/domain';
import { ITEM_STATUS_PRESENTATION, parseInventoryTags } from '@inplace/app-core';
import { FormField } from '@/shared/ui/FormField';
import { SectionCard } from '@/shared/ui/SectionCard';
import { CategoryArtwork } from '@/shared/ui/CategoryArtwork';
import { palette } from '@/shared/ui/theme';
import { LocationSelectField } from '@/features/home/LocationSelectField';
import { InventoryImage } from '@/features/inventory/InventoryImage';
import { FormChoice, InventoryDateInput } from './InventoryFormControls';
import type { InventoryFormController } from './useInventoryForm';

const KINDS: Array<{ value: CategoryScope; label: string }> = [{ value: 'item', label: '物品' }, { value: 'container', label: '收纳' }, { value: 'location', label: '位置' }];
const TRACKING: Array<{ value: TrackingMode; label: string }> = [{ value: 'unique', label: '独立物品' }, { value: 'quantity', label: '按数量' }, { value: 'consumable', label: '消耗品' }];
const STATUSES: ItemStatus[] = ['in_stock', 'borrowed', 'worn_out'];
const TAG_PREVIEW_LIMIT = 12;
const rail = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 };
const labelStyle = { fontSize: 13, fontWeight: '800' as const, color: palette.textMuted };

interface InventoryFormFieldsProps {
  form: InventoryFormController;
  categories: Category[];
  tags: string[];
  userId?: string;
  itemId?: string;
  canEdit: boolean;
  categoryError: boolean;
  retryCategories: () => void;
  nameInputRef?: Ref<TextInput>;
}

export function InventoryFormFields({ form, categories, tags, userId, itemId, canEdit, categoryError, retryCategories, nameInputRef }: InventoryFormFieldsProps) {
  const { draft, errors, update } = form;
  const disabled = form.isBusy || !canEdit;
  return <View style={{ gap: 12 }}>
    <SectionCard title="基础信息" density="compact">
      <View style={rail}>{KINDS.map((kind) => <FormChoice key={kind.value} label={kind.label} selected={form.scope === kind.value} disabled={disabled || Boolean(itemId)} onPress={() => form.changeKind(kind.value)} />)}</View>
      <FormField inputRef={nameInputRef} label="名称" value={draft.name} error={errors.name} editable={!disabled} onChangeText={(value) => update('name', value)} placeholder="必填" />
      <Text style={labelStyle}>收纳位置</Text>
      <LocationSelectField userId={userId} selectedParentId={draft.parentId} excludedIds={itemId && draft.type === 'container' ? [itemId] : []} disabled={disabled} onChange={(value) => update('parentId', value)} />
      <FormField label="分类" value={draft.category} error={errors.category} editable={!disabled} onChangeText={(value) => update('category', value)} placeholder="选择或填写分类" />
      {categoryError ? <Pressable accessibilityRole="button" onPress={retryCategories} disabled={disabled} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: palette.danger }}>分类加载失败，点击重试</Text></Pressable> : null}
      <View style={rail}>{categories.map((category) => <Pressable key={category.id} accessibilityRole="button" accessibilityLabel={`分类：${category.name}`} accessibilityState={{ selected: draft.category === category.name, disabled }} disabled={disabled} onPress={() => update('category', category.name)}
        style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 10, backgroundColor: draft.category === category.name ? palette.brandTint : palette.surfaceMuted, opacity: pressed ? 0.7 : 1 })}>
        <CategoryArtwork presetKey={category.preset_key} icon={category.icon} color={category.color} size="xs" /><Text style={{ color: palette.text }}>{category.name}</Text>
      </Pressable>)}</View>
      {draft.type === 'item' ? <View style={{ gap: 6 }}><Text style={labelStyle}>状态</Text><View style={rail}>{STATUSES.map((status) => <FormChoice key={status} label={ITEM_STATUS_PRESENTATION[status].label} selected={draft.status === status} disabled={disabled} onPress={() => update('status', status)} />)}</View></View> : null}

    </SectionCard>
    <Pressable accessibilityRole="button" accessibilityLabel="更多信息" accessibilityState={{ expanded: form.expanded }} onPress={() => form.setExpanded(!form.expanded)} style={{ minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' }}>
      <Text style={{ color: palette.brandStrong, fontSize: 15, fontWeight: '700' }}>{form.expanded ? '收起更多信息' : '更多信息 · 数量、价格、日期、标签和图片'}</Text>
    </Pressable>
    {form.expanded ? <SectionCard title="补充信息" density="compact">
      <FormField label="描述" value={draft.description} error={errors.description} editable={!disabled} multiline onChangeText={(value) => update('description', value)} style={{ minHeight: 80, textAlignVertical: 'top' }} />
      {draft.type === 'item' ? <>
        <FormField label="数量" value={draft.quantity} error={errors.quantity} editable={!disabled} keyboardType="number-pad" onChangeText={(value) => update('quantity', value)} />
        <Text style={labelStyle}>追踪方式</Text><View style={rail}>{TRACKING.map((mode) => <FormChoice key={mode.value} label={mode.label} selected={draft.trackingMode === mode.value} disabled={disabled} onPress={() => update('trackingMode', mode.value)} />)}</View>
        <FormField label="最低库存" value={draft.minimumQuantity} error={errors.minimumQuantity} editable={!disabled} keyboardType="number-pad" onChangeText={(value) => update('minimumQuantity', value)} placeholder="选填" />
        <FormField label="购买价格" value={draft.price} error={errors.price} editable={!disabled} keyboardType="decimal-pad" onChangeText={(value) => update('price', value)} placeholder="选填" />
        <InventoryDateInput label="到期日期" value={draft.expiryDate} error={errors.expiryDate} disabled={disabled} onChange={(value) => update('expiryDate', value)} />
        <InventoryDateInput label="购买日期" value={draft.purchaseDate} error={errors.purchaseDate} disabled={disabled} onChange={(value) => update('purchaseDate', value)} />
        <InventoryDateInput label="保修截止日期" value={draft.warrantyDate} error={errors.warrantyDate} disabled={disabled} onChange={(value) => update('warrantyDate', value)} />
      </> : null}
      <FormField label="标签" value={draft.tags} error={errors.tags} editable={!disabled} onChangeText={(value) => update('tags', value)} hint="多个标签用逗号分隔" />
      <View style={rail}>{tags.slice(0, TAG_PREVIEW_LIMIT).map((tag) => <FormChoice key={tag} label={`添加标签：${tag}`} selected={parseInventoryTags(draft.tags).includes(tag)} disabled={disabled} onPress={() => update('tags', parseInventoryTags(`${draft.tags},${tag}`).join(', '))} />)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="添加图片" disabled={disabled} onPress={() => void form.pickImage()} style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: palette.canvasStrong }}><Text style={{ color: palette.brandStrong }}>从相册选择并上传</Text></Pressable>
      <ScrollView horizontal contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">{draft.images.map((url, index) => <View key={url} style={{ gap: 4 }}>
        <InventoryImage url={url} style={{ width: 88, height: 88, borderRadius: 12 }} />
        <Pressable accessibilityRole="button" accessibilityLabel={`删除图片 ${index + 1}`} disabled={disabled} onPress={() => update('images', draft.images.filter((image) => image !== url))} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: palette.danger }}>删除图片</Text></Pressable>
      </View>)}</ScrollView>
    </SectionCard> : null}
  </View>;
}
