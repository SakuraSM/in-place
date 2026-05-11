import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { Database, TagEntity } from '@inplace/domain';
import { MANAGEMENT_COLOR_OPTIONS } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { tagsApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';

interface TagDraft {
  name: string;
  description: string;
  color: string;
}

const EMPTY_TAG: TagDraft = {
  name: '',
  description: '',
  color: 'sky',
};

export default function ManageTagsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<TagDraft>(EMPTY_TAG);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagEntity | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const tagsQuery = useQuery({
    queryKey: ['mobile', 'tags', user?.id],
    enabled: Boolean(user),
    queryFn: () => tagsApi.fetchTags(user!.id),
  });

  const refreshTags = async () => {
    await queryClient.invalidateQueries({ queryKey: ['mobile', 'tags', user?.id] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('请先登录');
      const payload: Database['public']['Tables']['tags']['Insert'] = {
        user_id: user.id,
        name: draft.name.trim(),
        description: draft.description.trim(),
        color: draft.color.trim() || 'sky',
      };

      if (!payload.name) throw new Error('标签名称不能为空');
      return editingId ? tagsApi.updateTag(editingId, payload) : tagsApi.createTag(payload);
    },
    onSuccess: async () => {
      setMessage(editingId ? '标签已更新' : '标签已创建');
      setDraft(EMPTY_TAG);
      setEditingId(null);
      await refreshTags();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagsApi.deleteTag(id),
    onSuccess: async () => {
      setMessage('标签已删除');
      setDeleteTarget(null);
      setEditingId(null);
      setDraft(EMPTY_TAG);
      await refreshTags();
    },
  });

  if (tagsQuery.isLoading) {
    return <Screen><StateBlock title="加载标签" loading /></Screen>;
  }

  if (tagsQuery.isError) {
    return <Screen><StateBlock title="标签加载失败" body={tagsQuery.error instanceof Error ? tagsQuery.error.message : '请稍后重试'} /></Screen>;
  }

  const tags = tagsQuery.data ?? [];
  const getColorLabel = (color: string) => MANAGEMENT_COLOR_OPTIONS.find((option) => option.value === color)?.label ?? color;

  const startEdit = (tag: TagEntity) => {
    setMessage(null);
    setEditingId(tag.id);
    setDraft({
      name: tag.name,
      description: tag.description,
      color: tag.color,
    });
  };

  return (
    <Screen scroll contentInsetMode="form" chrome="muted">
      <BrandHeader title="标签" variant="page" />

      <SectionCard title={editingId ? '编辑标签' : '新建标签'} delay={60} density="compact" headerMode="compact">
        {message ? <Text style={successTextStyle}>{message}</Text> : null}
        {saveMutation.isError ? <Text style={errorTextStyle}>{saveMutation.error instanceof Error ? saveMutation.error.message : '保存失败'}</Text> : null}
        {deleteMutation.isError ? <Text style={errorTextStyle}>{deleteMutation.error instanceof Error ? deleteMutation.error.message : '删除失败'}</Text> : null}

        <TextInput value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} placeholder="标签名称" style={inputStyle} />
        <TextInput
          value={draft.description}
          onChangeText={(description) => setDraft((current) => ({ ...current, description }))}
          placeholder="描述"
          style={[inputStyle, multilineInputStyle]}
          multiline
        />

        <View style={chipRowStyle}>
          {MANAGEMENT_COLOR_OPTIONS.map((option) => (
            <Pressable key={option.value} onPress={() => setDraft((current) => ({ ...current, color: option.value }))} style={[chipStyle, draft.color === option.value ? activeChipStyle : null]}>
              <Text style={draft.color === option.value ? activeChipTextStyle : chipTextStyle}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={actionRowStyle}>
          <Pressable onPress={() => { setEditingId(null); setDraft(EMPTY_TAG); }} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>重置</Text>
          </Pressable>
          <Pressable onPress={() => void saveMutation.mutateAsync()} style={primaryButtonStyle}>
            {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>{editingId ? '更新' : '新建'}</Text>}
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard title={`全部标签 ${tags.length}`} delay={120} density="compact" headerMode="compact">
        {tags.map((tag) => (
          <View key={tag.id} style={rowStyle}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={rowTitleStyle}>{tag.name}</Text>
              <Text style={bodyStyle}>{tag.description || '暂无'} · {getColorLabel(tag.color)}</Text>
            </View>
            <View style={miniRowStyle}>
              <Pressable onPress={() => startEdit(tag)} style={miniButtonStyle}>
                <Text style={miniButtonTextStyle}>编辑</Text>
              </Pressable>
              <Pressable onPress={() => setDeleteTarget(tag)} style={dangerMiniButtonStyle}>
                <Text style={dangerMiniButtonTextStyle}>删除</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </SectionCard>

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title="删除标签"
        message={`删除「${deleteTarget?.name ?? ''}」标签？`}
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
const multilineInputStyle = { minHeight: 84, textAlignVertical: 'top' as const };
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
