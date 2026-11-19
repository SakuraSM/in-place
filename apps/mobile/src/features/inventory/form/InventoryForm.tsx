import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View, type TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Item, ItemType } from '@inplace/domain';
import { getScopeLabel } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { useHousehold } from '@/providers/HouseholdProvider';
import { categoriesApi, itemsApi, tagsApi } from '@/shared/api/mobileClient';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ActionButtonRow, type ActionButtonConfig } from '@/shared/ui/ActionButtonRow';
import { SheetHeader } from '@/shared/ui/BottomSheet';
import { Screen, ScreenFooter } from '@/shared/ui/Screen';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';
import { InventoryFormFields } from './InventoryFormFields';
import { useInventoryForm } from './useInventoryForm';

interface InventoryFormProps {
  presentation: 'screen' | 'sheet';
  item?: Item;
  parentId?: string | null;
  type?: ItemType;
  onClose: () => void;
  onSaved: (item: Item) => void;
}

const RESET_ACTION_FLEX = 1;
const CONTINUE_ACTION_FLEX = 2.5;
const SAVE_ACTION_FLEX = 1.5;

export function InventoryForm({ presentation, item, parentId, type, onClose, onSaved }: InventoryFormProps) {
  const { user } = useAuth();
  const { currentHouseholdId, canEditInventory } = useHousehold();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const nameInput = useRef<TextInput>(null);
  const [focusName, setFocusName] = useState(0);
  const notify = useNotify();
  const form = useInventoryForm({
    item, parentId, type, userId: user?.id, canEdit: canEditInventory,
    persist: (payload) => item ? itemsApi.updateItem(item.id, payload) : itemsApi.createItem(payload),
    onClose,
    onSaved: (saved, continueAdding) => {
      void queryClient.invalidateQueries({ queryKey: ['mobile'] });
      if (continueAdding) {
        setFocusName((value) => value + 1);
        notify({ tone: 'success', title: `已添加${saved.name}`, description: '已保留类型、分类和位置，可继续录入' });
      } else onSaved(saved);
    },
  });
  useEffect(() => {
    if (focusName) {
      scroll.current?.scrollTo({ y: 0, animated: false });
      nameInput.current?.focus();
    }
  }, [focusName]);
  const categories = useQuery({
    queryKey: ['mobile', 'inventory-form-categories', currentHouseholdId, user?.id, form.scope],
    enabled: Boolean(user?.id && currentHouseholdId),
    queryFn: () => categoriesApi.fetchCategories(user!.id, form.scope),
  });
  const tags = useQuery({
    queryKey: ['mobile', 'inventory-form-tags', currentHouseholdId, user?.id],
    enabled: Boolean(user?.id && currentHouseholdId),
    queryFn: () => tagsApi.fetchTags(user!.id),
  });
  const { requestClose } = form;
  useFocusEffect(useCallback(() => {
    if (presentation === 'sheet') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { requestClose(); return true; });
    return () => subscription.remove();
  }, [presentation, requestClose]));
  useEffect(() => {
    if (form.error) scroll.current?.scrollTo({ y: 0, animated: true });
  }, [form.error]);

  const title = `${item ? '编辑' : '新增'}${getScopeLabel(form.scope)}`;
  const isSaveDisabled = form.isBusy || !canEditInventory || !form.draft.name.trim();
  const footerActions: ActionButtonConfig[] = [
    { key: 'reset', label: '重置', onPress: form.requestReset, disabled: form.isBusy || !form.isDirty || !canEditInventory, flex: RESET_ACTION_FLEX },
    ...(!item ? [{ key: 'continue', label: '保存并继续', onPress: () => void form.save(true), disabled: isSaveDisabled, variant: 'accent' as const, flex: CONTINUE_ACTION_FLEX }] : []),
    { key: 'save', label: '保存', onPress: () => void form.save(), disabled: isSaveDisabled, loading: form.isBusy, variant: 'primary', flex: SAVE_ACTION_FLEX },
  ];
  const content = <>
    {presentation === 'screen' ? <View style={{ paddingHorizontal: 16 }}><PageHeader title={title} onBack={requestClose} /></View> : <SheetHeader title={title} onClose={requestClose} closeLabel="关闭表单" disabled={form.isBusy} />}
    <ScrollView ref={scroll} testID="inventory-form-scroll" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {!canEditInventory ? <Text style={{ color: palette.textMuted }}>当前家庭为只读，无法编辑库存。</Text> : null}
      {form.error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: palette.danger }}>{form.error}</Text> : null}
      <InventoryFormFields nameInputRef={nameInput} form={form} categories={categories.data ?? []} tags={(tags.data ?? []).map((tag) => tag.name)} userId={user?.id} itemId={item?.id} canEdit={canEditInventory} categoryError={categories.isError} retryCategories={() => { void categories.refetch(); }} />
    </ScrollView>
    <ScreenFooter><ActionButtonRow actions={footerActions} compact /></ScreenFooter>
  </>;

  if (presentation === 'sheet') return <Modal visible transparent statusBarTranslucent animationType="slide" onRequestClose={requestClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable accessible={false} disabled={form.isBusy} onPress={requestClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: palette.overlay }} />
      <View accessibilityViewIsModal style={{ height: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: palette.canvas, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12), overflow: 'hidden' }}>{content}</View>
    </KeyboardAvoidingView>
  </Modal>;

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <Screen contentInsetMode="tight" chrome="none" contentStyle={{ paddingHorizontal: 0 }}>{content}</Screen>
  </KeyboardAvoidingView>;
}
