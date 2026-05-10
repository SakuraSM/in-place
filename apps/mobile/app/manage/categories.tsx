import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { Category, ItemType } from '@inplace/domain';
import { ITEM_TYPE_PRESENTATION, MANAGEMENT_COLOR_OPTIONS } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { categoriesApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';

interface CategoryDraft {
  item_type: ItemType;
  name: string;
  icon: string;
  color: string;
}

const EMPTY_CATEGORY: CategoryDraft = {
  item_type: 'item',
  name: '',
  icon: 'FolderTree',
  color: 'sky',
};

export default function ManageCategoriesScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY_CATEGORY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['mobile', 'categories', user?.id],
    enabled: Boolean(user),
    queryFn: () => categoriesApi.fetchCategories(user!.id),
  });

  const refreshCategories = async () => {
    await queryClient.invalidateQueries({ queryKey: ['mobile', 'categories', user?.id] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('请先登录');
      const payload: Omit<Category, 'id' | 'created_at'> = {
        user_id: user.id,
        item_type: draft.item_type,
        name: draft.name.trim(),
        icon: draft.icon.trim() || 'FolderTree',
        color: draft.color.trim() || 'sky',
      };

      if (!payload.name) throw new Error('分类名称不能为空');
      return editingId ? categoriesApi.updateCategory(editingId, payload) : categoriesApi.createCategory(payload);
    },
    onSuccess: async () => {
      setMessage(editingId ? '分类已更新' : '分类已创建');
      setDraft(EMPTY_CATEGORY);
      setEditingId(null);
      await refreshCategories();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.deleteCategory(id),
    onSuccess: async () => {
      setMessage('分类已删除');
      setDeleteTarget(null);
      setEditingId(null);
      setDraft(EMPTY_CATEGORY);
      await refreshCategories();
    },
  });

  if (categoriesQuery.isLoading) {
    return <Screen><StateBlock title="加载分类" loading /></Screen>;
  }

  if (categoriesQuery.isError) {
    return <Screen><StateBlock title="分类加载失败" body={categoriesQuery.error instanceof Error ? categoriesQuery.error.message : '请稍后重试'} /></Screen>;
  }

  const categories = categoriesQuery.data ?? [];

  const startEdit = (category: Category) => {
    setMessage(null);
    setEditingId(category.id);
    setDraft({
      item_type: category.item_type,
      name: category.name,
      icon: category.icon,
      color: category.color,
    });
  };

  const getColorLabel = (color: string) => MANAGEMENT_COLOR_OPTIONS.find((option) => option.value === color)?.label ?? color;

  return (
    <Screen scroll contentInsetMode="form" chrome="muted">
      <BrandHeader title="分类" variant="page" />

      <SectionCard title={editingId ? '编辑分类' : '新建分类'} delay={60} density="compact" headerMode="compact">
        {message ? <Text style={successTextStyle}>{message}</Text> : null}
        {saveMutation.isError ? <Text style={errorTextStyle}>{saveMutation.error instanceof Error ? saveMutation.error.message : '保存失败'}</Text> : null}
        {deleteMutation.isError ? <Text style={errorTextStyle}>{deleteMutation.error instanceof Error ? deleteMutation.error.message : '删除失败'}</Text> : null}

        <View style={chipRowStyle}>
          {(['item', 'container'] as ItemType[]).map((type) => (
            <Pressable key={type} onPress={() => setDraft((current) => ({ ...current, item_type: type }))} style={[chipStyle, draft.item_type === type ? activeChipStyle : null]}>
              <Text style={draft.item_type === type ? activeChipTextStyle : chipTextStyle}>{ITEM_TYPE_PRESENTATION[type].label}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} placeholder="分类名称" style={inputStyle} />

        <View style={chipRowStyle}>
          {MANAGEMENT_COLOR_OPTIONS.map((option) => (
            <Pressable key={option.value} onPress={() => setDraft((current) => ({ ...current, color: option.value }))} style={[chipStyle, draft.color === option.value ? activeChipStyle : null]}>
              <Text style={draft.color === option.value ? activeChipTextStyle : chipTextStyle}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={actionRowStyle}>
          <Pressable onPress={() => { setEditingId(null); setDraft(EMPTY_CATEGORY); }} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>重置</Text>
          </Pressable>
          <Pressable onPress={() => void saveMutation.mutateAsync()} style={primaryButtonStyle}>
            {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>{editingId ? '更新' : '新建'}</Text>}
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title={`全部分类 ${categories.length}`} delay={120} density="compact" headerMode="compact">
        {categories.map((category) => (
          <View key={category.id} style={rowStyle}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={rowTitleStyle}>{category.name}</Text>
              <Text style={bodyStyle}>{ITEM_TYPE_PRESENTATION[category.item_type].label} · {getColorLabel(category.color)}</Text>
            </View>
            <View style={miniRowStyle}>
              <Pressable onPress={() => startEdit(category)} style={miniButtonStyle}>
                <Text style={miniButtonTextStyle}>编辑</Text>
              </Pressable>
              <Pressable onPress={() => setDeleteTarget(category)} style={dangerMiniButtonStyle}>
                <Text style={dangerMiniButtonTextStyle}>删除</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </SectionCard>

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title="删除分类"
        message={`删除「${deleteTarget?.name ?? ''}」分类？`}
        confirmLabel={deleteMutation.isPending ? '删除中...' : '删除'}
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteMutation.mutateAsync(deleteTarget.id);
        }}
      />
    </Screen>
  );
}

const bodyStyle = { fontSize: 14, color: palette.textMuted };
const successTextStyle = { color: '#15803d', fontSize: 14 };
const errorTextStyle = { color: palette.danger, fontSize: 14 };
const chipRowStyle = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 };
const chipStyle = {
  borderRadius: 999,
  backgroundColor: palette.surfaceMuted,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 12,
  paddingVertical: 7,
};
const activeChipStyle = { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' };
const chipTextStyle = { color: palette.textMuted, fontSize: 13, fontWeight: '600' as const };
const activeChipTextStyle = { color: '#0369a1', fontSize: 13, fontWeight: '700' as const };
const inputStyle = {
  backgroundColor: palette.surfaceMuted,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 15,
  color: palette.text,
};
const actionRowStyle = { flexDirection: 'row' as const, gap: 12 };
const secondaryButtonStyle = { flex: 1, borderRadius: 16, backgroundColor: palette.canvasStrong, paddingVertical: 13, alignItems: 'center' as const };
const secondaryButtonTextStyle = { color: palette.text, fontSize: 15, fontWeight: '700' as const };
const primaryButtonStyle = { flex: 1, borderRadius: 16, backgroundColor: palette.brand, paddingVertical: 13, alignItems: 'center' as const };
const primaryButtonTextStyle = { color: '#ffffff', fontSize: 15, fontWeight: '700' as const };
const rowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, borderTopWidth: 1, borderTopColor: palette.borderSoft, paddingTop: 12 };
const rowTitleStyle = { fontSize: 16, fontWeight: '700' as const, color: palette.text };
const miniRowStyle = { flexDirection: 'row' as const, gap: 8 };
const miniButtonStyle = { borderRadius: 10, backgroundColor: palette.canvasStrong, paddingHorizontal: 12, paddingVertical: 8 };
const miniButtonTextStyle = { color: palette.text, fontSize: 13, fontWeight: '700' as const };
const dangerMiniButtonStyle = { borderRadius: 10, backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8 };
const dangerMiniButtonTextStyle = { color: palette.danger, fontSize: 13, fontWeight: '700' as const };
