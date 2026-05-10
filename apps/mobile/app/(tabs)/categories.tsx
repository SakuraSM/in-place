import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComponentProps } from 'react';
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
type WorkbenchAction = 'locations' | 'activity' | ManagementSection;

interface WorkbenchShortcut {
  action: WorkbenchAction;
  label: string;
  description: string;
  iconName: ComponentProps<typeof Ionicons>['name'];
  meta: string;
}

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

function createWorkbenchShortcuts(params: { categoriesCount: number; tagsCount: number }): WorkbenchShortcut[] {
  return [
    {
      action: 'locations',
      label: '位置树',
      description: '按空间查看物品归属',
      iconName: 'location-outline',
      meta: '进入',
    },
    {
      action: 'activity',
      label: '操作记录',
      description: '查看最近录入和修改',
      iconName: 'time-outline',
      meta: '进入',
    },
    {
      action: 'categories',
      label: '分类管理',
      description: '维护物品和容器分类',
      iconName: 'folder-open-outline',
      meta: `${params.categoriesCount} 项`,
    },
    {
      action: 'tags',
      label: '标签管理',
      description: '整理搜索和筛选标签',
      iconName: 'pricetags-outline',
      meta: `${params.tagsCount} 个`,
    },
  ];
}

function isManagementSection(action: WorkbenchAction): action is ManagementSection {
  return action === 'categories' || action === 'tags';
}

function WorkbenchShortcutContent({
  shortcut,
  isActive = false,
}: {
  shortcut: WorkbenchShortcut;
  isActive?: boolean;
}) {
  return (
    <>
      <View style={[workbenchIconStyle, isActive ? activeWorkbenchIconStyle : null]}>
        <Ionicons name={shortcut.iconName} size={20} color={isActive ? '#ffffff' : palette.brandStrong} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={workbenchTitleStyle}>{shortcut.label}</Text>
        <Text style={captionStyle}>{shortcut.description}</Text>
      </View>
      <Text style={workbenchMetaStyle}>{shortcut.meta}</Text>
    </>
  );
}

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
    return <Screen><StateBlock title="加载分类" loading /></Screen>;
  }

  if (categoriesQuery.isError || tagsQuery.isError) {
    const error = categoriesQuery.error ?? tagsQuery.error;
    return <Screen><StateBlock title="分类加载失败" body={error instanceof Error ? error.message : '请稍后重试'} /></Screen>;
  }

  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const workbenchShortcuts = createWorkbenchShortcuts({
    categoriesCount: categories.length,
    tagsCount: tags.length,
  });

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
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Entrance variant="page">
        <BrandHeader title="工作台" variant="page" />
      </Entrance>

      <SectionCard title="常用入口" delay={50} density="compact" headerMode="compact">
        <View style={workbenchGridStyle}>
          {workbenchShortcuts.map((shortcut) => {
            if (shortcut.action === 'locations') {
              return (
                <Link key={shortcut.action} href="/(tabs)/locations" asChild>
                  <Pressable style={workbenchTileStyle}>
                    <WorkbenchShortcutContent shortcut={shortcut} />
                  </Pressable>
                </Link>
              );
            }

            if (shortcut.action === 'activity') {
              return (
                <Link key={shortcut.action} href="/(tabs)/activity" asChild>
                  <Pressable style={workbenchTileStyle}>
                    <WorkbenchShortcutContent shortcut={shortcut} />
                  </Pressable>
                </Link>
              );
            }

            if (isManagementSection(shortcut.action)) {
              const managementAction = shortcut.action;

              return (
                <Pressable
                  key={managementAction}
                  onPress={() => setActiveSection(managementAction)}
                  style={[
                    workbenchTileStyle,
                    activeSection === managementAction ? activeWorkbenchTileStyle : null,
                  ]}
                >
                  <WorkbenchShortcutContent shortcut={shortcut} isActive={activeSection === managementAction} />
                </Pressable>
              );
            }

            return null;
          })}
        </View>
      </SectionCard>

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
      <SectionCard title="分类" delay={70} density="compact" headerMode="compact">
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
      <SectionCard title="标签" delay={150} density="compact" headerMode="compact">
        {message ? <Text style={successTextStyle}>{message}</Text> : null}
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
              <Text style={bodyStyle}>{tag.description || '暂无'} · {getColorLabel(tag.color)}</Text>
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
        message={`删除「${deleteCategoryTarget?.name ?? ''}」分类？`}
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
        message={`删除「${deleteTagTarget?.name ?? ''}」标签？`}
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

const workbenchGridStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 10,
};

const workbenchTileStyle = {
  width: '48%' as const,
  minHeight: 134,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surfaceMuted,
  padding: 12,
  gap: 10,
};

const activeWorkbenchTileStyle = {
  borderColor: palette.brand,
  backgroundColor: '#f0fdfa',
};

const workbenchIconStyle = {
  width: 34,
  height: 34,
  borderRadius: 12,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: '#e0f2fe',
};

const activeWorkbenchIconStyle = {
  backgroundColor: palette.brand,
};

const workbenchTitleStyle = {
  fontSize: 15,
  fontWeight: '800' as const,
  color: palette.text,
};

const workbenchMetaStyle = {
  fontSize: 13,
  fontWeight: '700' as const,
  color: palette.brandStrong,
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
  gap: 10,
  paddingTop: 4,
};

const segmentedStyle = {
  flexDirection: 'row' as const,
  gap: 10,
};

const segmentButtonStyle = {
  flex: 1,
  alignItems: 'center' as const,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  paddingVertical: 12,
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
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 16,
  paddingVertical: 12,
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
  paddingVertical: 7,
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
  paddingVertical: 13,
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
  paddingVertical: 13,
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
