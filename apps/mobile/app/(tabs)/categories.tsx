import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { Category, Database, ItemType, TagEntity } from '@inplace/domain';
import { ITEM_TYPE_PRESENTATION, MANAGEMENT_COLOR_OPTIONS } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { categoriesApi, tagsApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Entrance } from '@/shared/ui/Entrance';
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

interface TagDraft {
  name: string;
  description: string;
  color: string;
}

type ManagementSection = 'categories' | 'tags';

const EMPTY_CATEGORY: CategoryDraft = {
  item_type: 'item',
  name: '',
  icon: 'FolderTree',
  color: 'sky',
};

const EMPTY_TAG: TagDraft = {
  name: '',
  description: '',
  color: 'sky',
};

export default function CategoriesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(EMPTY_CATEGORY);
  const [tagDraft, setTagDraft] = useState<TagDraft>(EMPTY_TAG);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ManagementSection>('categories');
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null);
  const [deleteTagTarget, setDeleteTagTarget] = useState<TagEntity | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['mobile', 'categories', user?.id],
    enabled: Boolean(user),
    queryFn: () => categoriesApi.fetchCategories(user!.id),
  });
  const tagsQuery = useQuery({
    queryKey: ['mobile', 'tags', user?.id],
    enabled: Boolean(user),
    queryFn: () => tagsApi.fetchTags(user!.id),
  });

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['mobile', 'categories', user?.id] });
    await queryClient.invalidateQueries({ queryKey: ['mobile', 'tags', user?.id] });
  };

  const categoryMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('请先登录');
      }

      const payload: Omit<Category, 'id' | 'created_at'> = {
        user_id: user.id,
        item_type: categoryDraft.item_type,
        name: categoryDraft.name.trim(),
        icon: categoryDraft.icon.trim() || 'FolderTree',
        color: categoryDraft.color.trim() || 'sky',
      };

      if (!payload.name) {
        throw new Error('分类名称不能为空');
      }

      if (editingCategoryId) {
        return categoriesApi.updateCategory(editingCategoryId, payload);
      }

      return categoriesApi.createCategory(payload);
    },
    onSuccess: async () => {
      setMessage(editingCategoryId ? '分类已更新' : '分类已创建');
      setCategoryDraft(EMPTY_CATEGORY);
      setEditingCategoryId(null);
      await refreshAll();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.deleteCategory(id),
    onSuccess: async () => {
      setMessage('分类已删除');
      if (editingCategoryId) {
        setCategoryDraft(EMPTY_CATEGORY);
        setEditingCategoryId(null);
      }
      setDeleteCategoryTarget(null);
      await refreshAll();
    },
  });

  const tagMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('请先登录');
      }

      const payload: Database['public']['Tables']['tags']['Insert'] = {
        user_id: user.id,
        name: tagDraft.name.trim(),
        description: tagDraft.description.trim(),
        color: tagDraft.color.trim() || 'sky',
      };

      if (!payload.name) {
        throw new Error('标签名称不能为空');
      }

      if (editingTagId) {
        return tagsApi.updateTag(editingTagId, payload);
      }

      return tagsApi.createTag(payload);
    },
    onSuccess: async () => {
      setMessage(editingTagId ? '标签已更新' : '标签已创建');
      setTagDraft(EMPTY_TAG);
      setEditingTagId(null);
      await refreshAll();
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => tagsApi.deleteTag(id),
    onSuccess: async () => {
      setMessage('标签已删除');
      if (editingTagId) {
        setTagDraft(EMPTY_TAG);
        setEditingTagId(null);
      }
      setDeleteTagTarget(null);
      await refreshAll();
    },
  });

  if (categoriesQuery.isLoading || tagsQuery.isLoading) {
    return <Screen><StateBlock title="正在加载分类" loading body="分类和标签会一起读取。" /></Screen>;
  }

  if (categoriesQuery.isError || tagsQuery.isError) {
    const error = categoriesQuery.error ?? tagsQuery.error;
    return <Screen><StateBlock title="分类加载失败" body={error instanceof Error ? error.message : '请稍后重试。'} /></Screen>;
  }

  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const activeSectionLabel = activeSection === 'categories' ? '分类管理' : '标签管理';

  const startEditCategory = (category: Category) => {
    setMessage(null);
    setEditingCategoryId(category.id);
    setCategoryDraft({
      item_type: category.item_type,
      name: category.name,
      icon: category.icon,
      color: category.color,
    });
  };

  const startEditTag = (tag: TagEntity) => {
    setMessage(null);
    setEditingTagId(tag.id);
    setTagDraft({
      name: tag.name,
      description: tag.description,
      color: tag.color,
    });
  };

  const getColorLabel = (color: string) => {
    return MANAGEMENT_COLOR_OPTIONS.find((option) => option.value === color)?.label ?? color;
  };

  return (
    <Screen scroll>
      <Entrance>
        <BrandHeader title="管理" subtitle={`${activeSectionLabel}与 Web 端保持一致，维护统一分类和标签库。`} />
      </Entrance>

      <View style={segmentedStyle}>
        {([
          { value: 'categories' as const, label: `分类 ${categories.length}` },
          { value: 'tags' as const, label: `标签 ${tags.length}` },
        ]).map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setActiveSection(option.value)}
            style={[segmentButtonStyle, activeSection === option.value ? activeSegmentStyle : null]}
          >
            <Text style={activeSection === option.value ? activeSegmentTextStyle : segmentTextStyle}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {activeSection === 'categories' ? (
      <SectionCard title="分类管理" subtitle="统一收纳和物品分类结构，让首页和总览都更清晰。" delay={70}>
        <Text style={captionStyle}>分类数：{categories.length}</Text>
        {message ? <Text style={successTextStyle}>{message}</Text> : null}
        {categoryMutation.isError ? <Text style={errorTextStyle}>{categoryMutation.error instanceof Error ? categoryMutation.error.message : '分类保存失败'}</Text> : null}
        {deleteCategoryMutation.isError ? <Text style={errorTextStyle}>{deleteCategoryMutation.error instanceof Error ? deleteCategoryMutation.error.message : '分类删除失败'}</Text> : null}

        <View style={formStyle}>
          <View style={pillRowStyle}>
            {(['item', 'container'] as ItemType[]).map((value) => (
              <Pressable
                key={value}
                onPress={() => setCategoryDraft((current) => ({ ...current, item_type: value }))}
                style={[chipStyle, categoryDraft.item_type === value ? activeChipStyle : null]}
              >
                <Text style={categoryDraft.item_type === value ? activeChipTextStyle : chipTextStyle}>
                  {ITEM_TYPE_PRESENTATION[value].label}分类
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={categoryDraft.name}
            onChangeText={(value) => setCategoryDraft((current) => ({ ...current, name: value }))}
            placeholder="分类名称"
            style={inputStyle}
          />
          <TextInput
            value={categoryDraft.icon}
            onChangeText={(value) => setCategoryDraft((current) => ({ ...current, icon: value }))}
            placeholder="图标名，例如 FolderTree"
            style={inputStyle}
          />
          <TextInput
            value={categoryDraft.color}
            onChangeText={(value) => setCategoryDraft((current) => ({ ...current, color: value }))}
            placeholder="颜色，例如 sky"
            style={inputStyle}
          />
          <View style={pillRowStyle}>
            {MANAGEMENT_COLOR_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setCategoryDraft((current) => ({ ...current, color: option.value }))}
                style={[chipStyle, categoryDraft.color === option.value ? activeChipStyle : null]}
              >
                <Text style={categoryDraft.color === option.value ? activeChipTextStyle : chipTextStyle}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={actionRowStyle}>
            <Pressable
              onPress={() => {
                setEditingCategoryId(null);
                setCategoryDraft(EMPTY_CATEGORY);
              }}
              style={secondaryButtonStyle}
            >
              <Text style={secondaryButtonTextStyle}>重置</Text>
            </Pressable>
            <Pressable onPress={() => void categoryMutation.mutateAsync()} style={primaryButtonStyle}>
              {categoryMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>{editingCategoryId ? '更新分类' : '新建分类'}</Text>}
            </Pressable>
          </View>
        </View>

        {categories.map((category) => (
          <View key={category.id} style={rowStyle}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={listTitleStyle}>{category.name}</Text>
              <Text style={bodyStyle}>
                {ITEM_TYPE_PRESENTATION[category.item_type].label}分类 · {getColorLabel(category.color)} · {category.icon}
              </Text>
            </View>
            <View style={miniRowStyle}>
              <Pressable onPress={() => startEditCategory(category)} style={miniButtonStyle}>
                <Text style={miniButtonTextStyle}>编辑</Text>
              </Pressable>
              <Pressable onPress={() => setDeleteCategoryTarget(category)} style={dangerMiniButtonStyle}>
                <Text style={dangerMiniButtonTextStyle}>删除</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </SectionCard>
      ) : null}

      {activeSection === 'tags' ? (
      <SectionCard title="标签管理" subtitle="维护统一标签库，减少重复命名，方便搜索和批量整理。" delay={150}>
        <Text style={captionStyle}>标签数：{tags.length}</Text>
        {tagMutation.isError ? <Text style={errorTextStyle}>{tagMutation.error instanceof Error ? tagMutation.error.message : '标签保存失败'}</Text> : null}
        {deleteTagMutation.isError ? <Text style={errorTextStyle}>{deleteTagMutation.error instanceof Error ? deleteTagMutation.error.message : '标签删除失败'}</Text> : null}

        <View style={formStyle}>
          <TextInput
            value={tagDraft.name}
            onChangeText={(value) => setTagDraft((current) => ({ ...current, name: value }))}
            placeholder="标签名称"
            style={inputStyle}
          />
          <TextInput
            value={tagDraft.description}
            onChangeText={(value) => setTagDraft((current) => ({ ...current, description: value }))}
            placeholder="标签描述"
            style={[inputStyle, { minHeight: 84, textAlignVertical: 'top' as const }]}
            multiline
          />
          <TextInput
            value={tagDraft.color}
            onChangeText={(value) => setTagDraft((current) => ({ ...current, color: value }))}
            placeholder="颜色，例如 sky"
            style={inputStyle}
          />
          <View style={pillRowStyle}>
            {MANAGEMENT_COLOR_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setTagDraft((current) => ({ ...current, color: option.value }))}
                style={[chipStyle, tagDraft.color === option.value ? activeChipStyle : null]}
              >
                <Text style={tagDraft.color === option.value ? activeChipTextStyle : chipTextStyle}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={actionRowStyle}>
            <Pressable
              onPress={() => {
                setEditingTagId(null);
                setTagDraft(EMPTY_TAG);
              }}
              style={secondaryButtonStyle}
            >
              <Text style={secondaryButtonTextStyle}>重置</Text>
            </Pressable>
            <Pressable onPress={() => void tagMutation.mutateAsync()} style={primaryButtonStyle}>
              {tagMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>{editingTagId ? '更新标签' : '新建标签'}</Text>}
            </Pressable>
          </View>
        </View>

        {tags.map((tag) => (
          <View key={tag.id} style={rowStyle}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={listTitleStyle}>{tag.name}</Text>
              <Text style={bodyStyle}>{tag.description || '暂无说明'} · {getColorLabel(tag.color)}</Text>
            </View>
            <View style={miniRowStyle}>
              <Pressable onPress={() => startEditTag(tag)} style={miniButtonStyle}>
                <Text style={miniButtonTextStyle}>编辑</Text>
              </Pressable>
              <Pressable onPress={() => setDeleteTagTarget(tag)} style={dangerMiniButtonStyle}>
                <Text style={dangerMiniButtonTextStyle}>删除</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </SectionCard>
      ) : null}

      <ConfirmDialog
        visible={Boolean(deleteCategoryTarget)}
        title="删除分类"
        message={`确定要删除「${deleteCategoryTarget?.name ?? ''}」分类吗？已使用该分类的物品不会被删除，但会失去这个分类标记。`}
        confirmLabel={deleteCategoryMutation.isPending ? '删除中...' : '删除'}
        danger
        loading={deleteCategoryMutation.isPending}
        onCancel={() => setDeleteCategoryTarget(null)}
        onConfirm={() => {
          if (deleteCategoryTarget) {
            void deleteCategoryMutation.mutateAsync(deleteCategoryTarget.id);
          }
        }}
      />

      <ConfirmDialog
        visible={Boolean(deleteTagTarget)}
        title="删除标签"
        message={`确定要删除「${deleteTagTarget?.name ?? ''}」标签吗？所有物品上的这个标签都会被同步移除。`}
        confirmLabel={deleteTagMutation.isPending ? '删除中...' : '删除'}
        danger
        loading={deleteTagMutation.isPending}
        onCancel={() => setDeleteTagTarget(null)}
        onConfirm={() => {
          if (deleteTagTarget) {
            void deleteTagMutation.mutateAsync(deleteTagTarget.id);
          }
        }}
      />
    </Screen>
  );
}

const captionStyle = {
  fontSize: 13,
  color: palette.textSoft,
};

const bodyStyle = {
  fontSize: 15,
  color: palette.textMuted,
};

const rowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
  borderTopWidth: 1,
  borderTopColor: palette.borderSoft,
  paddingTop: 12,
};

const listTitleStyle = {
  fontSize: 16,
  fontWeight: '600' as const,
  color: palette.text,
};

const formStyle = {
  gap: 12,
  paddingTop: 8,
};

const segmentedStyle = {
  flexDirection: 'row' as const,
  gap: 10,
};

const segmentButtonStyle = {
  flex: 1,
  alignItems: 'center' as const,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  paddingVertical: 13,
};

const activeSegmentStyle = {
  borderColor: palette.brand,
  backgroundColor: palette.brand,
};

const segmentTextStyle = {
  color: palette.textMuted,
  fontSize: 15,
  fontWeight: '700' as const,
};

const activeSegmentTextStyle = {
  color: '#ffffff',
  fontSize: 15,
  fontWeight: '800' as const,
};

const inputStyle = {
  backgroundColor: palette.surfaceMuted,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 15,
  color: palette.text,
};

const pillRowStyle = {
  flexDirection: 'row' as const,
  gap: 8,
  flexWrap: 'wrap' as const,
};

const chipStyle = {
  borderRadius: 999,
  backgroundColor: palette.surfaceMuted,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 12,
  paddingVertical: 8,
};

const activeChipStyle = {
  backgroundColor: '#e0f2fe',
  borderColor: '#7dd3fc',
};

const chipTextStyle = {
  color: palette.textMuted,
  fontSize: 13,
  fontWeight: '500' as const,
};

const activeChipTextStyle = {
  color: '#0369a1',
  fontSize: 13,
  fontWeight: '600' as const,
};

const actionRowStyle = {
  flexDirection: 'row' as const,
  gap: 12,
};

const secondaryButtonStyle = {
  flex: 1,
  borderRadius: 16,
  backgroundColor: palette.canvasStrong,
  paddingVertical: 14,
  alignItems: 'center' as const,
};

const secondaryButtonTextStyle = {
  color: palette.text,
  fontSize: 15,
  fontWeight: '600' as const,
};

const primaryButtonStyle = {
  flex: 1,
  borderRadius: 16,
  backgroundColor: palette.brand,
  paddingVertical: 14,
  alignItems: 'center' as const,
};

const primaryButtonTextStyle = {
  color: '#ffffff',
  fontSize: 15,
  fontWeight: '600' as const,
};

const miniRowStyle = {
  flexDirection: 'row' as const,
  gap: 8,
};

const miniButtonStyle = {
  borderRadius: 10,
  backgroundColor: palette.canvasStrong,
  paddingHorizontal: 12,
  paddingVertical: 8,
};

const miniButtonTextStyle = {
  color: palette.text,
  fontSize: 13,
  fontWeight: '600' as const,
};

const dangerMiniButtonStyle = {
  borderRadius: 10,
  backgroundColor: '#fee2e2',
  paddingHorizontal: 12,
  paddingVertical: 8,
};

const dangerMiniButtonTextStyle = {
  color: palette.danger,
  fontSize: 13,
  fontWeight: '600' as const,
};

const successTextStyle = {
  color: '#15803d',
  fontSize: 14,
};

const errorTextStyle = {
  color: palette.danger,
  fontSize: 14,
};
