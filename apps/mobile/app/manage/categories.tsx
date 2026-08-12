import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { Category, CategoryScope } from '@inplace/domain';
import { MANAGEMENT_COLOR_OPTIONS } from '@inplace/app-core';
import { getCategoryPresetLegacyIcon } from '@inplace/ui/category-artwork';
import { useAuth } from '@/providers/AuthProvider';
import { useHousehold } from '@/providers/HouseholdProvider';
import { categoriesApi } from '@/shared/api/mobileClient';
import { PageHeader } from '@/shared/ui/PageHeader';
import { CategoryArtwork } from '@/shared/ui/CategoryArtwork';
import { ContentTabs, type ContentTab } from '@/shared/ui/ContentTabs';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';
import { useNotify } from '@/shared/ui/ToastProvider';

interface CategoryDraft {
  scope: CategoryScope;
  name: string;
  icon: string;
  color: string;
}

const EMPTY_CATEGORY: CategoryDraft = {
  scope: 'location',
  name: '',
  icon: 'FolderTree',
  color: 'sky',
};

const SCOPE_TABS: ContentTab<CategoryScope>[] = [
  { value: 'location', label: '位置分类' },
  { value: 'container', label: '收纳分类' },
  { value: 'item', label: '物品分类' },
];

const SCOPE_DESCRIPTIONS: Record<CategoryScope, string> = {
  location: '用于公寓、房间、楼层等空间位置。',
  container: '用于柜子、抽屉、收纳箱等收纳载体。',
  item: '用于数码、服饰、餐厨等具体物品。',
};

export default function ManageCategoriesScreen() {
  const { user } = useAuth();
  const { canEditInventory, currentHouseholdId } = useHousehold();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const [activeScope, setActiveScope] = useState<CategoryScope>('location');
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY_CATEGORY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['mobile', 'categories', currentHouseholdId, user?.id],
    enabled: Boolean(user),
    queryFn: () => categoriesApi.fetchCategories(user!.id),
  });
  const presetsQuery = useQuery({
    queryKey: ['mobile', 'category-presets', currentHouseholdId, user?.id],
    enabled: Boolean(user),
    queryFn: () => categoriesApi.fetchCategoryPresets(),
  });

  const refreshCategories = async () => {
    await queryClient.invalidateQueries({ queryKey: ['mobile', 'categories', currentHouseholdId, user?.id] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('请先登录');
      const payload: Pick<Category, 'user_id' | 'scope' | 'name' | 'icon' | 'color'> = {
        user_id: user.id,
        scope: draft.scope,
        name: draft.name.trim(),
        icon: draft.icon.trim() || 'FolderTree',
        color: draft.color.trim() || 'sky',
      };

      if (!payload.name) throw new Error('分类名称不能为空');
      return editingId ? categoriesApi.updateCategory(editingId, payload) : categoriesApi.createCategory(payload);
    },
    onSuccess: async () => {
      notify({ tone: 'success', title: editingId ? '分类已更新' : '分类已创建' });
      setMessage(null);
      setDraft({ ...EMPTY_CATEGORY, scope: activeScope });
      setEditingId(null);
      await refreshCategories();
    },
    onError: (error) => {
      notify({ tone: 'error', title: '分类保存失败', description: error instanceof Error ? error.message : '请稍后重试' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.deleteCategory(id),
    onSuccess: async () => {
      notify({ tone: 'success', title: '分类已删除' });
      setMessage(null);
      setDeleteTarget(null);
      setEditingId(null);
      setDraft({ ...EMPTY_CATEGORY, scope: activeScope });
      await refreshCategories();
    },
  });

  const applyPresetsMutation = useMutation({
    mutationFn: () => categoriesApi.applyCategoryPresets(),
    onSuccess: async (result) => {
      notify({
        tone: 'success',
        title: `已补充 ${result.addedCount} 个推荐分类`,
        description: result.skippedCount > 0 ? `${result.skippedCount} 个已有分类已跳过` : undefined,
      });
      await Promise.all([
        refreshCategories(),
        queryClient.invalidateQueries({ queryKey: ['mobile', 'category-presets', currentHouseholdId, user?.id] }),
      ]);
    },
    onError: (error) => {
      notify({ tone: 'error', title: '推荐分类补充失败', description: error instanceof Error ? error.message : '请稍后重试' });
    },
  });

  if (categoriesQuery.isLoading) {
    return <Screen><StateBlock title="加载分类" loading /></Screen>;
  }

  if (categoriesQuery.isError) {
    return <Screen><StateBlock title="分类加载失败" body={categoriesQuery.error instanceof Error ? categoriesQuery.error.message : '请稍后重试'} /></Screen>;
  }

  const categories = categoriesQuery.data ?? [];
  const visibleCategories = categories.filter((category) => category.scope === activeScope);
  const editingCategory = editingId ? categories.find((category) => category.id === editingId) : null;
  const editingPresetIcon = getCategoryPresetLegacyIcon(editingCategory?.preset_key);
  const tabs = SCOPE_TABS.map((tab) => ({
    ...tab,
    count: categories.filter((category) => category.scope === tab.value).length,
  }));

  const startEdit = (category: Category) => {
    setMessage(null);
    setActiveScope(category.scope);
    setEditingId(category.id);
    setDraft({
      scope: category.scope,
      name: category.name,
      icon: category.icon,
      color: category.color,
    });
  };

  const getColorLabel = (color: string) => MANAGEMENT_COLOR_OPTIONS.find((option) => option.value === color)?.label ?? color;

  return (
    <Screen scroll contentInsetMode="form" chrome="muted">
      <PageHeader title="分类" subtitle="管理位置、收纳与物品分类" />

      <ContentTabs
        accessibilityLabel="分类用途"
        tabs={tabs}
        value={activeScope}
        onChange={(scope) => {
          setActiveScope(scope);
          setEditingId(null);
          setDraft({ ...EMPTY_CATEGORY, scope });
        }}
      />

      <SectionCard
        title="推荐分类"
        subtitle={SCOPE_DESCRIPTIONS[activeScope]}
        delay={30}
        density="compact"
        headerMode="compact"
      >
        <View style={presetRowStyle}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={rowTitleStyle}>
              {presetsQuery.data?.missingCount ? `还可补充 ${presetsQuery.data.missingCount} 个` : '推荐分类已齐全'}
            </Text>
            <Text style={bodyStyle}>不会覆盖已有分类，已主动删除的预设不会恢复。</Text>
          </View>
          {canEditInventory && Boolean(presetsQuery.data?.missingCount) ? <Pressable
            accessibilityRole="button"
            disabled={applyPresetsMutation.isPending}
            onPress={() => applyPresetsMutation.mutate()}
            style={miniButtonStyle}
          >
            <Text style={miniButtonTextStyle}>{applyPresetsMutation.isPending ? '补充中' : '一键补充'}</Text>
          </Pressable> : null}
        </View>
      </SectionCard>

      {canEditInventory ? <SectionCard title={editingId ? '编辑分类' : '新建分类'} delay={60} density="compact" headerMode="compact">
        {message ? <Text style={successTextStyle}>{message}</Text> : null}
        {saveMutation.isError ? <Text style={errorTextStyle}>{saveMutation.error instanceof Error ? saveMutation.error.message : '保存失败'}</Text> : null}
        {deleteMutation.isError ? <Text style={errorTextStyle}>{deleteMutation.error instanceof Error ? deleteMutation.error.message : '删除失败'}</Text> : null}

        <Text style={scopeNoticeStyle}>
          用途：{activeScope === 'location' ? '位置' : activeScope === 'container' ? '收纳' : '物品'}
          {editingId ? '（创建后不可修改）' : ''}
        </Text>

        <View style={editorIdentityStyle}>
          <CategoryArtwork
            presetKey={editingCategory?.preset_key}
            icon={draft.icon}
            color={draft.color}
            size="md"
          />
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="分类名称"
            accessibilityLabel="分类名称"
            style={[inputStyle, { flex: 1 }]}
          />
        </View>

        {editingPresetIcon ? (
          <View style={presetVisualRowStyle}>
            <Text style={bodyStyle}>
              {draft.icon === editingPresetIcon ? '当前使用预设插画' : '当前使用自定义图标'}
            </Text>
            {draft.icon !== editingPresetIcon ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="恢复预设图片"
                onPress={() => setDraft((current) => ({ ...current, icon: editingPresetIcon }))}
                style={miniButtonStyle}
              >
                <Text style={miniButtonTextStyle}>恢复预设图片</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={chipRowStyle}>
          {MANAGEMENT_COLOR_OPTIONS.map((option) => (
            <Pressable key={option.value} onPress={() => setDraft((current) => ({ ...current, color: option.value }))} style={[chipStyle, draft.color === option.value ? activeChipStyle : null]}>
              <Text style={draft.color === option.value ? activeChipTextStyle : chipTextStyle}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={actionRowStyle}>
          <Pressable onPress={() => { setEditingId(null); setDraft({ ...EMPTY_CATEGORY, scope: activeScope }); }} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>重置</Text>
          </Pressable>
          <Pressable onPress={() => void saveMutation.mutateAsync()} style={primaryButtonStyle}>
            {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>{editingId ? '更新' : '新建'}</Text>}
          </Pressable>
        </View>
      </SectionCard> : null}

      <SectionCard title={`${SCOPE_TABS.find((tab) => tab.value === activeScope)?.label ?? '分类'} ${visibleCategories.length}`} delay={120} density="compact" headerMode="compact">
        {visibleCategories.length === 0 ? <Text style={bodyStyle}>当前用途还没有分类。</Text> : null}
        {visibleCategories.map((category) => (
          <View key={category.id} style={rowStyle}>
            <CategoryArtwork
              presetKey={category.preset_key}
              icon={category.icon}
              color={category.color}
              size="sm"
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={rowTitleStyle}>{category.name}</Text>
              <Text style={bodyStyle}>{category.scope === 'location' ? '位置' : category.scope === 'container' ? '收纳' : '物品'} · {getColorLabel(category.color)}</Text>
            </View>
            {canEditInventory ? <View style={miniRowStyle}>
              <Pressable onPress={() => startEdit(category)} style={miniButtonStyle}>
                <Text style={miniButtonTextStyle}>编辑</Text>
              </Pressable>
              <Pressable onPress={() => setDeleteTarget(category)} style={dangerMiniButtonStyle}>
                <Text style={dangerMiniButtonTextStyle}>删除</Text>
              </Pressable>
            </View> : null}
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
const scopeNoticeStyle = { fontSize: 13, fontWeight: '700' as const, color: palette.brandStrong };
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
const activeChipStyle = { backgroundColor: palette.brandTint, borderColor: '#99f6e4' };
const chipTextStyle = { color: palette.textMuted, fontSize: 13, fontWeight: '600' as const };
const activeChipTextStyle = { color: palette.brandStrong, fontSize: 13, fontWeight: '700' as const };
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
const presetRowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 };
const editorIdentityStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 };
const presetVisualRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 12,
};
