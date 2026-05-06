import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Item, ItemStatus, ItemType } from '@inplace/domain';
import { ITEM_STATUS_PRESENTATION, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { categoriesApi, itemsApi, uploadImageFromUri } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';

const STATUS_OPTIONS: ItemStatus[] = ['in_stock', 'borrowed', 'worn_out'];
const TYPE_OPTIONS: ItemType[] = ['item', 'container'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

interface FormState {
  type: ItemType;
  name: string;
  description: string;
  category: string;
  status: ItemStatus;
  price: string;
  tags: string;
  images: string[];
}

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

export default function ItemFormScreen() {
  const { id, parentId, type } = useLocalSearchParams<{
    id?: string;
    parentId?: string;
    type?: ItemType;
  }>();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const itemQuery = useQuery({
    queryKey: ['mobile', 'edit-item', id],
    enabled: Boolean(id),
    queryFn: () => itemsApi.fetchItem(id!),
  });

  const effectiveType: ItemType = isEditing ? itemQuery.data?.type ?? 'item' : type === 'container' ? 'container' : 'item';

  const categoriesQuery = useQuery({
    queryKey: ['mobile', 'form-categories', user?.id, effectiveType],
    enabled: Boolean(user),
    queryFn: () => categoriesApi.fetchCategories(user!.id, effectiveType),
  });

  const initialForm = useMemo<FormState>(() => ({
    type: effectiveType,
    name: itemQuery.data?.name ?? '',
    description: itemQuery.data?.description ?? '',
    category: itemQuery.data?.category ?? '',
    status: itemQuery.data?.status ?? 'in_stock',
    price: itemQuery.data?.price === null || itemQuery.data?.price === undefined ? '' : String(itemQuery.data.price),
    tags: itemQuery.data?.tags.join(', ') ?? '',
    images: itemQuery.data?.images ?? [],
  }), [effectiveType, itemQuery.data]);

  const [draft, setDraft] = useState<FormState>(initialForm);
  const [hasTouched, setHasTouched] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!hasTouched) {
      setDraft(initialForm);
    }
  }, [hasTouched, initialForm]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('请先登录');
      }

      const payload: Omit<Item, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        parent_id: isEditing ? itemQuery.data?.parent_id ?? null : parentId ?? null,
        type: draft.type,
        name: draft.name.trim(),
        description: draft.description.trim(),
        category: draft.category.trim(),
        status: draft.status,
        price: draft.price.trim() ? Number(draft.price.trim()) : null,
        purchase_date: null,
        warranty_date: null,
        images: draft.images,
        tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        metadata: isEditing ? itemQuery.data?.metadata ?? {} : {},
      };

      if (!payload.name) {
        throw new Error('名称不能为空');
      }

      if (isEditing) {
        return itemsApi.updateItem(id!, payload);
      }

      return itemsApi.createItem(payload);
    },
    onSuccess: async (savedItem) => {
      await queryClient.invalidateQueries({ queryKey: ['mobile'] });
      router.replace(`/item/${savedItem.id}`);
    },
  });

  const applyInitialForm = () => {
    setHasTouched(false);
    setDraft(initialForm);
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    try {
      await mutation.mutateAsync();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '保存失败');
    }
  };

  const handlePickImage = async () => {
    setSubmitError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSubmitError('请先允许访问相册');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.82,
      selectionLimit: 1,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const validationError = validatePickedImage(asset);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setUploadingImage(true);

    try {
      const uploadedUrl = await uploadImageFromUri({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      setHasTouched(true);
      setDraft((current) => ({
        ...current,
        images: [...current.images, uploadedUrl],
      }));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (url: string) => {
    setHasTouched(true);
    setDraft((current) => ({
      ...current,
      images: current.images.filter((imageUrl) => imageUrl !== url),
    }));
  };

  if (itemQuery.isLoading || categoriesQuery.isLoading) {
    return <Screen><StateBlock title="正在准备表单" loading body="正在读取物品与分类信息。" /></Screen>;
  }

  if (itemQuery.isError || categoriesQuery.isError) {
    const error = itemQuery.error ?? categoriesQuery.error;
    return <Screen><StateBlock title="表单加载失败" body={error instanceof Error ? error.message : '请稍后重试。'} /></Screen>;
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: isEditing ? '编辑物品' : '新建物品', headerShown: true }} />

      <BrandHeader
        compact
        title={isEditing ? '编辑物品' : '新建物品'}
        subtitle={isEditing ? '修改基础信息并保存。' : `当前将创建${draft.type === 'container' ? '收纳' : '物品'}。`}
      />

      <SectionCard
        title="基础表单"
        subtitle="表单结构、分段切换和标签芯片向 Web 的信息密度对齐。"
        delay={70}
      >
        {!isEditing ? (
          <View style={segmentedStyle}>
            {TYPE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setHasTouched(true);
                  setDraft((current) => ({ ...current, type: option, category: '' }));
                }}
                style={[segmentButtonStyle, draft.type === option ? activeSegmentStyle : null]}
              >
                <Text style={draft.type === option ? activeSegmentTextStyle : segmentTextStyle}>
                  {ITEM_TYPE_PRESENTATION[option].label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Field label="名称">
          <TextInput
            value={draft.name}
            onChangeText={(value) => {
              setHasTouched(true);
              setDraft((current) => ({ ...current, name: value }));
            }}
            placeholder="输入名称"
            style={inputStyle}
          />
        </Field>

        <Field label="描述">
          <TextInput
            value={draft.description}
            onChangeText={(value) => {
              setHasTouched(true);
              setDraft((current) => ({ ...current, description: value }));
            }}
            placeholder="输入描述"
            style={[inputStyle, { minHeight: 96, textAlignVertical: 'top' as const }]}
            multiline
          />
        </Field>

        <Field label="分类">
          <View style={{ gap: 10 }}>
            <TextInput
              value={draft.category}
              onChangeText={(value) => {
                setHasTouched(true);
                setDraft((current) => ({ ...current, category: value }));
              }}
              placeholder="输入分类名称"
              style={inputStyle}
            />
            {categories.length > 0 ? (
              <View style={chipWrapStyle}>
                {categories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => {
                      setHasTouched(true);
                      setDraft((current) => ({ ...current, category: category.name }));
                    }}
                    style={[
                      chipStyle,
                      draft.category === category.name ? activeChipStyle : null,
                    ]}
                  >
                    <Text style={draft.category === category.name ? activeChipTextStyle : chipTextStyle}>
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </Field>

        {draft.type === 'item' ? (
          <>
            <Field label="状态">
              <View style={chipWrapStyle}>
                {STATUS_OPTIONS.map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => {
                      setHasTouched(true);
                      setDraft((current) => ({ ...current, status }));
                    }}
                    style={[chipStyle, draft.status === status ? activeChipStyle : null]}
                  >
                    <Text style={draft.status === status ? activeChipTextStyle : chipTextStyle}>
                      {ITEM_STATUS_PRESENTATION[status].label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            <Field label="价格">
              <TextInput
                value={draft.price}
                onChangeText={(value) => {
                  setHasTouched(true);
                  setDraft((current) => ({ ...current, price: value }));
                }}
                placeholder="例如 99.00"
                keyboardType="decimal-pad"
                style={inputStyle}
              />
            </Field>
          </>
        ) : null}

        <Field label="标签">
          <TextInput
            value={draft.tags}
            onChangeText={(value) => {
              setHasTouched(true);
              setDraft((current) => ({ ...current, tags: value }));
            }}
            placeholder="多个标签用英文逗号分隔"
            style={inputStyle}
          />
        </Field>

        <Field label="图片">
          <View style={{ gap: 12 }}>
            <Pressable
              disabled={uploadingImage || mutation.isPending}
              onPress={() => void handlePickImage()}
              style={[secondaryButtonStyle, (uploadingImage || mutation.isPending) ? disabledButtonStyle : null]}
            >
              {uploadingImage ? (
                <ActivityIndicator />
              ) : (
                <Text style={secondaryButtonTextStyle}>从相册选择并上传</Text>
              )}
            </Pressable>

            {draft.images.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {draft.images.map((imageUrl) => (
                  <View key={imageUrl} style={imageCardStyle}>
                    <Image source={{ uri: imageUrl }} style={imageStyle} />
                    <Pressable onPress={() => removeImage(imageUrl)} style={imageRemoveButtonStyle}>
                      <Text style={imageRemoveTextStyle}>删除</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={emptyHintStyle}>当前还没有图片。</Text>
            )}
          </View>
        </Field>

        {submitError ? <Text style={{ color: palette.danger }}>{submitError}</Text> : null}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={applyInitialForm} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>重置</Text>
          </Pressable>
          <Pressable
            disabled={mutation.isPending || uploadingImage}
            onPress={() => void handleSubmit()}
            style={[primaryButtonStyle, (mutation.isPending || uploadingImage) ? disabledButtonStyle : null]}
          >
            {mutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>保存</Text>}
          </Pressable>
        </View>
      </SectionCard>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: palette.textMuted }}>{label}</Text>
      {children as never}
    </View>
  );
}

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

const segmentedStyle = {
  flexDirection: 'row' as const,
  gap: 8,
};

const segmentButtonStyle = {
  flex: 1,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingVertical: 12,
  alignItems: 'center' as const,
};

const activeSegmentStyle = {
  backgroundColor: palette.brand,
  borderColor: palette.brand,
};

const segmentTextStyle = {
  color: palette.textMuted,
  fontWeight: '600' as const,
};

const activeSegmentTextStyle = {
  color: '#ffffff',
  fontWeight: '600' as const,
};

const chipWrapStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 8,
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
  backgroundColor: palette.brandTint,
  borderColor: '#7dd3fc',
};

const chipTextStyle = {
  color: palette.textMuted,
  fontSize: 13,
  fontWeight: '500' as const,
};

const activeChipTextStyle = {
  color: palette.brandStrong,
  fontSize: 13,
  fontWeight: '600' as const,
};

const secondaryButtonStyle = {
  flex: 1,
  borderRadius: 16,
  backgroundColor: palette.surface,
  borderWidth: 1,
  borderColor: palette.border,
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

const emptyHintStyle = {
  color: palette.textSoft,
  fontSize: 14,
};

const imageCardStyle = {
  gap: 8,
};

const imageStyle = {
  width: 120,
  height: 120,
  borderRadius: 16,
  backgroundColor: palette.canvasStrong,
};

const imageRemoveButtonStyle = {
  alignItems: 'center' as const,
  paddingVertical: 8,
  borderRadius: 12,
  backgroundColor: palette.dangerTint,
};

const imageRemoveTextStyle = {
  color: palette.danger,
  fontSize: 13,
  fontWeight: '600' as const,
};
