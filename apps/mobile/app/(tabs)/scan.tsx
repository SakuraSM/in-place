import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { AIRecognitionResult, Item } from '@inplace/domain';
import { ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { aiApi, itemsApi, recognizeItemsFromUri, uploadImageFromUri } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Entrance } from '@/shared/ui/Entrance';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';

interface SelectedAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

interface DraftRecognition {
  result: AIRecognitionResult;
  selected: boolean;
  saved: boolean;
  editing: boolean;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function validatePickedImage(asset: ImagePicker.ImagePickerAsset) {
  if (asset.type && asset.type !== 'image') {
    return '仅支持上传图片文件';
  }

  if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE_BYTES) {
    return '图片不能超过 10MB，请压缩后重试';
  }

  if (asset.mimeType && !asset.mimeType.startsWith('image/')) {
    return '仅支持上传图片文件';
  }

  return null;
}

export default function ScanTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);
  const [drafts, setDrafts] = useState<DraftRecognition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const aiStatusQuery = useQuery({
    queryKey: ['mobile', 'ai-status', user?.id],
    enabled: Boolean(user),
    queryFn: () => aiApi.fetchAiAvailability(),
  });

  const recognizeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAsset) {
        throw new Error('请先选择图片');
      }

      return recognizeItemsFromUri(selectedAsset);
    },
    onSuccess: (results) => {
      setDrafts(results.map((result) => ({
        result,
        selected: true,
        saved: false,
        editing: false,
      })));
      setMessage(results.length > 0 ? `识别完成，共 ${results.length} 个结果` : '未识别到可用结果');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('请先登录');
      }

      const selectedDrafts = drafts.filter((draft) => draft.selected && !draft.saved);
      if (selectedDrafts.length === 0) {
        throw new Error('请至少选择一个识别结果');
      }

      let uploadedImageUrl: string | null = null;
      if (selectedAsset) {
        uploadedImageUrl = await uploadImageFromUri(selectedAsset);
      }

      const createdItems = await Promise.all(
        selectedDrafts.map((draft) => {
          const payload: Omit<Item, 'id' | 'created_at' | 'updated_at'> = {
            user_id: user.id,
            parent_id: null,
            type: draft.result.type ?? 'item',
            name: draft.result.name,
            description: draft.result.description,
            category: draft.result.category,
            status: 'in_stock',
            price: draft.result.price ?? null,
            purchase_date: null,
            warranty_date: null,
            images: uploadedImageUrl ? [uploadedImageUrl] : [],
            tags: draft.result.tags,
            metadata: {
              ai_recognized: true,
              brand: draft.result.brand,
              source_image: 'mobile-scan',
              bounding_box: draft.result.boundingBox ?? null,
            },
          };

          return itemsApi.createItem(payload);
        }),
      );

      return createdItems;
    },
    onSuccess: async (_, __, ___) => {
      setDrafts((current) => current.map((draft) => (draft.selected ? { ...draft, saved: true } : draft)));
      setMessage('选中结果已保存');
      await queryClient.invalidateQueries({ queryKey: ['mobile'] });
    },
  });

  const pickImage = async () => {
    setError(null);
    setMessage(null);
    setDrafts([]);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('请先允许访问相册');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.82,
      allowsEditing: true,
      selectionLimit: 1,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const validationError = validatePickedImage(asset);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedAsset({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    });
  };

  const takePhoto = async () => {
    setError(null);
    setMessage(null);
    setDrafts([]);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('请先允许访问相机');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.82,
      allowsEditing: true,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const validationError = validatePickedImage(asset);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedAsset({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    });
  };

  const handleRecognize = async () => {
    setError(null);
    setMessage(null);

    try {
      await recognizeMutation.mutateAsync();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '识别失败');
    }
  };

  const handleSaveSelected = async () => {
    setError(null);
    setMessage(null);

    try {
      await saveMutation.mutateAsync();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '保存失败');
    }
  };

  const toggleDraft = (index: number) => {
    setDrafts((current) => current.map((draft, currentIndex) => (
      currentIndex === index ? { ...draft, selected: !draft.selected } : draft
    )));
  };

  const toggleDraftEditing = (index: number) => {
    setDrafts((current) => current.map((draft, currentIndex) => (
      currentIndex === index ? { ...draft, editing: !draft.editing } : draft
    )));
  };

  const updateDraft = (index: number, updater: (draft: DraftRecognition) => DraftRecognition) => {
    setDrafts((current) => current.map((draft, currentIndex) => (
      currentIndex === index ? updater(draft) : draft
    )));
  };

  if (aiStatusQuery.isLoading) {
    return <Screen><StateBlock title="正在检查 AI 状态" loading /></Screen>;
  }

  if (aiStatusQuery.isError) {
    return <Screen><StateBlock title="AI 状态读取失败" body={aiStatusQuery.error instanceof Error ? aiStatusQuery.error.message : '请稍后重试。'} /></Screen>;
  }

  if (!aiStatusQuery.data) {
    return <Screen><StateBlock title="AI 功能未启用" body="请先在个人中心配置服务端 AI 设置。" /></Screen>;
  }

  return (
    <Screen scroll>
      <Entrance>
        <BrandHeader title="AI 扫描" subtitle="拍照或选图自动识别物品并录入。" />
      </Entrance>

      <SectionCard title="识别图片" subtitle="支持直接拍照，也支持从相册选取已有图片。" delay={70}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable disabled={recognizeMutation.isPending || saveMutation.isPending} onPress={() => void takePhoto()} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>拍照扫描</Text>
          </Pressable>
          <Pressable disabled={recognizeMutation.isPending || saveMutation.isPending} onPress={() => void pickImage()} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>选择图片</Text>
          </Pressable>
          <Pressable
            disabled={!selectedAsset || recognizeMutation.isPending || saveMutation.isPending}
            onPress={() => void handleRecognize()}
            style={[
              primaryButtonStyle,
              (!selectedAsset || recognizeMutation.isPending || saveMutation.isPending) ? disabledButtonStyle : null,
            ]}
          >
            {recognizeMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>开始识别</Text>}
          </Pressable>
        </View>

        {selectedAsset ? (
          <Image source={{ uri: selectedAsset.uri }} style={previewStyle} />
        ) : (
          <Text style={hintStyle}>还没有选择图片。</Text>
        )}

        {message ? <Text style={successStyle}>{message}</Text> : null}
        {error ? <Text style={errorStyle}>{error}</Text> : null}
      </SectionCard>

      <SectionCard title="识别结果" subtitle="保持卡片式结果编排，编辑后再批量保存。" delay={150}>
        <Pressable
          onPress={() => void handleSaveSelected()}
          disabled={saveMutation.isPending || drafts.every((draft) => !draft.selected || draft.saved)}
          style={[
            primaryButtonStyle,
            (saveMutation.isPending || drafts.every((draft) => !draft.selected || draft.saved)) ? disabledButtonStyle : null,
          ]}
        >
          {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>保存选中</Text>}
        </Pressable>

        {drafts.length === 0 ? (
          <Text style={hintStyle}>识别结果会显示在这里。</Text>
        ) : (
          drafts.map((draft, index) => (
            <Pressable
              key={`${draft.result.name}-${index}`}
              onPress={() => toggleDraft(index)}
              style={[
                draftCardStyle,
                draft.selected ? activeDraftCardStyle : null,
              ]}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={draftTitleStyle}>{draft.result.name}</Text>
                <Text style={hintStyle}>
                  {ITEM_TYPE_PRESENTATION[draft.result.type ?? 'item'].label}{draft.result.category ? ` · ${draft.result.category}` : ''}
                </Text>
                <Text style={bodyStyle}>{draft.result.description || '暂无描述'}</Text>
                <Text style={hintStyle}>
                  标签：{draft.result.tags.length ? draft.result.tags.join('、') : '暂无'}
                </Text>
                <Pressable onPress={() => toggleDraftEditing(index)} style={miniButtonStyle}>
                  <Text style={miniButtonTextStyle}>{draft.editing ? '收起编辑' : '编辑结果'}</Text>
                </Pressable>
                {draft.editing ? (
                  <View style={{ gap: 8 }}>
                    <TextInput
                      value={draft.result.name}
                      onChangeText={(value) => updateDraft(index, (current) => ({
                        ...current,
                        result: { ...current.result, name: value },
                      }))}
                      placeholder="名称"
                      style={inputStyle}
                    />
                    <TextInput
                      value={draft.result.category}
                      onChangeText={(value) => updateDraft(index, (current) => ({
                        ...current,
                        result: { ...current.result, category: value },
                      }))}
                      placeholder="分类"
                      style={inputStyle}
                    />
                    <TextInput
                      value={draft.result.description}
                      onChangeText={(value) => updateDraft(index, (current) => ({
                        ...current,
                        result: { ...current.result, description: value },
                      }))}
                      placeholder="描述"
                      style={[inputStyle, { minHeight: 84, textAlignVertical: 'top' as const }]}
                      multiline
                    />
                    <TextInput
                      value={draft.result.tags.join(', ')}
                      onChangeText={(value) => updateDraft(index, (current) => ({
                        ...current,
                        result: {
                          ...current.result,
                          tags: value.split(',').map((tag) => tag.trim()).filter(Boolean),
                        },
                      }))}
                      placeholder="标签，英文逗号分隔"
                      style={inputStyle}
                    />
                  </View>
                ) : null}
              </View>
              <Text style={draft.saved ? savedStyle : selectStyle}>
                {draft.saved ? '已保存' : draft.selected ? '已选中' : '未选中'}
              </Text>
            </Pressable>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const bodyStyle = {
  fontSize: 15,
  color: palette.textMuted,
};

const hintStyle = {
  fontSize: 14,
  color: palette.textSoft,
};

const errorStyle = {
  fontSize: 14,
  color: palette.danger,
};

const successStyle = {
  fontSize: 14,
  color: '#15803d',
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

const disabledButtonStyle = {
  opacity: 0.55,
};

const primaryButtonTextStyle = {
  color: '#ffffff',
  fontSize: 15,
  fontWeight: '600' as const,
};

const previewStyle = {
  width: '100%' as const,
  aspectRatio: 4 / 3,
  borderRadius: 22,
  backgroundColor: palette.canvasStrong,
};

const draftCardStyle = {
  flexDirection: 'row' as const,
  gap: 12,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  padding: 16,
};

const activeDraftCardStyle = {
  borderColor: '#7dd3fc',
  backgroundColor: palette.brandTint,
};

const draftTitleStyle = {
  fontSize: 16,
  fontWeight: '700' as const,
  color: palette.text,
};

const selectStyle = {
  color: '#0369a1',
  fontSize: 13,
  fontWeight: '600' as const,
};

const savedStyle = {
  color: '#15803d',
  fontSize: 13,
  fontWeight: '700' as const,
};

const miniButtonStyle = {
  alignSelf: 'flex-start' as const,
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

const inputStyle = {
  backgroundColor: palette.surface,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: palette.text,
};
