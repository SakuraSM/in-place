import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Item, ItemStatus, ItemType } from '@inplace/domain';
import { ITEM_STATUS_PRESENTATION, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { categoriesApi, getMobileApiBaseUrl, itemsApi, tagsApi, uploadImageFromUri } from '@/shared/api/mobileClient';
import { updateLocationMetadata } from '@/shared/lib/location';
import { palette, shadows } from '@/shared/ui/theme';
import { LocationSelectField } from './LocationSelectField';

interface HomeItemFormSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface FormState {
  type: ItemType;
  isLocation: boolean;
  name: string;
  description: string;
  category: string;
  status: ItemStatus;
  price: string;
  purchaseDate: string;
  warrantyDate: string;
  tags: string;
  images: string[];
  parentId: string | null;
}

const STATUS_OPTIONS: ItemStatus[] = ['in_stock', 'borrowed', 'worn_out'];
const TYPE_OPTIONS: ItemType[] = ['item', 'container'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
type DateFieldKey = 'purchaseDate' | 'warrantyDate';

const INITIAL_FORM: FormState = {
  type: 'item',
  isLocation: false,
  name: '',
  description: '',
  category: '',
  status: 'in_stock',
  price: '',
  purchaseDate: '',
  warrantyDate: '',
  tags: '',
  images: [],
  parentId: null,
};

export function HomeItemFormSheet({ visible, onClose }: HomeItemFormSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<FormState>(INITIAL_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeDateField, setActiveDateField] = useState<DateFieldKey | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['mobile', 'home-form-categories', user?.id, draft.type],
    enabled: visible && Boolean(user),
    queryFn: () => categoriesApi.fetchCategories(user!.id, draft.type),
  });

  const tagsQuery = useQuery({
    queryKey: ['mobile', 'home-form-tags', user?.id],
    enabled: visible && Boolean(user),
    queryFn: () => tagsApi.fetchTags(user!.id),
  });

  const availableTags = useMemo(
    () => (tagsQuery.data ?? []).map((tag) => tag.name).sort((left, right) => left.localeCompare(right, 'zh-CN')),
    [tagsQuery.data],
  );

  useEffect(() => {
    if (visible) {
      setDraft(INITIAL_FORM);
      setSubmitError(null);
      setActiveDateField(null);
    }
  }, [visible]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('请先登录');
      }

      const payload: Omit<Item, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        parent_id: draft.parentId,
        type: draft.type,
        name: draft.name.trim(),
        description: draft.description.trim(),
        category: draft.category.trim(),
        status: draft.status,
        price: draft.price.trim() ? Number(draft.price.trim()) : null,
        purchase_date: draft.purchaseDate.trim() || null,
        warranty_date: draft.warrantyDate.trim() || null,
        images: draft.images,
        tags: parseTags(draft.tags),
        metadata: updateLocationMetadata({}, draft.type === 'container' && draft.isLocation),
      };

      if (!payload.name) {
        throw new Error('名称不能为空');
      }

      return itemsApi.createItem(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile'] });
      setDraft(INITIAL_FORM);
      setSubmitError(null);
      onClose();
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : '保存失败');
    },
  });

  const updateDraft = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!activeDateField) {
      return;
    }

    if (Platform.OS === 'android') {
      setActiveDateField(null);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    updateDraft(activeDateField, formatDateInput(selectedDate));
  };

  const handleClose = () => {
    if (mutation.isPending || uploadingImage) {
      return;
    }

    setSubmitError(null);
    setDraft(INITIAL_FORM);
    setActiveDateField(null);
    onClose();
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
      updateDraft('images', [...draft.images, uploadedUrl]);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setUploadingImage(false);
    }
  };

  const categories = categoriesQuery.data ?? [];
  const isBusy = mutation.isPending || uploadingImage;
  const title = `新增${draft.type === 'container' ? (draft.isLocation ? '位置' : '收纳') : '物品'}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={modalRootStyle}>
        <Pressable style={backdropStyle} onPress={handleClose} />
        <View style={sheetStyle}>
          <View style={dragHandleStyle} />
          <View style={sheetHeaderStyle}>
            <Text style={sheetTitleStyle}>{title}</Text>
            <Pressable onPress={handleClose} style={closeButtonStyle}>
              <Ionicons name="close" size={18} color={palette.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={formContentStyle} keyboardShouldPersistTaps="handled">
            <View style={segmentedStyle}>
              {TYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setDraft((current) => ({ ...current, type: option, category: '', isLocation: option === 'container' ? current.isLocation : false }))}
                  style={[segmentButtonStyle, draft.type === option ? activeSegmentStyle : null]}
                >
                  <Text style={draft.type === option ? activeSegmentTextStyle : segmentTextStyle}>
                    {ITEM_TYPE_PRESENTATION[option].label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {draft.type === 'container' ? (
              <Field label="标记为位置">
                <Pressable
                  onPress={() => updateDraft('isLocation', !draft.isLocation)}
                  style={[switchRowStyle, draft.isLocation ? switchRowActiveStyle : null]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={switchTitleStyle}>作为位置使用</Text>
                    <Text style={switchDescriptionStyle}>作为空间节点</Text>
                  </View>
                  <View style={[switchTrackStyle, draft.isLocation ? switchTrackActiveStyle : null]}>
                    <View style={[switchThumbStyle, draft.isLocation ? switchThumbActiveStyle : null]} />
                  </View>
                </Pressable>
              </Field>
            ) : null}

            <Field label="名称 *">
              <TextInput
                value={draft.name}
                onChangeText={(value) => updateDraft('name', value)}
                placeholder={draft.type === 'container' ? (draft.isLocation ? '卧室、客厅' : '收纳箱、抽屉') : '蓝色羽绒服'}
                style={inputStyle}
              />
            </Field>

            <Field label="描述">
              <TextInput
                value={draft.description}
                onChangeText={(value) => updateDraft('description', value)}
                placeholder="备注"
                style={[inputStyle, multilineInputStyle]}
                multiline
              />
            </Field>

            <Field label="类别">
              {categoriesQuery.isLoading ? (
                  <Text style={emptyHintStyle}>加载类别...</Text>
              ) : categories.length === 0 ? (
                <Text style={emptyHintStyle}>暂无自定义类别，请前往「工作台」添加。</Text>
              ) : (
                <View style={chipWrapStyle}>
                  {categories.map((category) => {
                    const isActive = draft.category === category.name;
                    return (
                      <Pressable
                        key={category.id}
                        onPress={() => updateDraft('category', isActive ? '' : category.name)}
                        style={[chipStyle, isActive ? activeChipStyle : null]}
                      >
                        <Text style={isActive ? activeChipTextStyle : chipTextStyle}>{category.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Field>

            {draft.type === 'item' ? (
              <>
                <Field label="状态">
                  <View style={chipWrapStyle}>
                    {STATUS_OPTIONS.map((status) => {
                      const isActive = draft.status === status;
                      return (
                        <Pressable key={status} onPress={() => updateDraft('status', status)} style={[chipStyle, isActive ? activeChipStyle : null]}>
                          <Text style={isActive ? activeChipTextStyle : chipTextStyle}>{ITEM_STATUS_PRESENTATION[status].label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Field>

                <View style={fieldGridStyle}>
                  <Field label="购买价格">
                    <TextInput value={draft.price} onChangeText={(value) => updateDraft('price', value)} placeholder="0.00" keyboardType="decimal-pad" style={inputStyle} />
                  </Field>
                  <Field label="购买日期">
                    <DateInputButton value={draft.purchaseDate} onOpen={() => setActiveDateField('purchaseDate')} onClear={() => updateDraft('purchaseDate', '')} />
                  </Field>
                </View>

                <Field label="保修截止日期">
                  <DateInputButton value={draft.warrantyDate} onOpen={() => setActiveDateField('warrantyDate')} onClear={() => updateDraft('warrantyDate', '')} />
                </Field>
              </>
            ) : null}

            <Field label="放置位置">
              <LocationSelectField
                userId={user?.id}
                selectedParentId={draft.parentId}
                onChange={(parentId) => updateDraft('parentId', parentId)}
              />
            </Field>

            <Field label="标签">
              {availableTags.length > 0 ? (
                <View style={chipWrapStyle}>
                  {availableTags.slice(0, 12).map((tag) => (
                    <Pressable key={tag} onPress={() => updateDraft('tags', mergeTagInput(draft.tags, tag))} style={chipStyle}>
                      <Text style={chipTextStyle}>{tag}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <TextInput
                value={draft.tags}
                onChangeText={(value) => updateDraft('tags', value)}
                placeholder="标签，英文逗号分隔"
                style={inputStyle}
              />
            </Field>

            <Field label="图片">
              <View style={{ gap: 12 }}>
                <Pressable disabled={isBusy} onPress={() => void handlePickImage()} style={[secondaryButtonStyle, isBusy ? disabledStyle : null]}>
                  {uploadingImage ? <ActivityIndicator /> : <Text style={secondaryButtonTextStyle}>从相册选择并上传</Text>}
                </Pressable>
                {draft.images.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {draft.images.map((imageUrl) => (
                      <View key={imageUrl} style={imageCardStyle}>
                        <Image source={{ uri: resolveImageUri(imageUrl) }} style={imageStyle} />
                        <Pressable onPress={() => updateDraft('images', draft.images.filter((value) => value !== imageUrl))} style={imageRemoveButtonStyle}>
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

            {submitError ? <Text style={errorTextStyle}>{submitError}</Text> : null}
          </ScrollView>

          <View style={sheetFooterStyle}>
            <Pressable disabled={isBusy} onPress={() => setDraft(INITIAL_FORM)} style={[footerSecondaryButtonStyle, isBusy ? disabledStyle : null]}>
              <Text style={footerSecondaryTextStyle}>重置</Text>
            </Pressable>
            <Pressable disabled={isBusy} onPress={() => mutation.mutate()} style={[footerPrimaryButtonStyle, isBusy ? disabledStyle : null]}>
              {mutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={footerPrimaryTextStyle}>保存</Text>}
            </Pressable>
          </View>

          {activeDateField ? (
            <DateTimePicker
              value={parseDateInput(draft[activeDateField]) ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleDateChange}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function DateInputButton({ value, onOpen, onClear }: { value: string; onOpen: () => void; onClear: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={onOpen} style={inputButtonStyle}>
        <Text style={value ? inputButtonTextStyle : inputButtonPlaceholderStyle}>{value || '选择日期'}</Text>
      </Pressable>
      {value ? (
        <Pressable onPress={onClear} style={dateClearButtonStyle}>
          <Text style={dateClearTextStyle}>清除</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function parseDateInput(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyle}>
      <Text style={fieldLabelStyle}>{label}</Text>
      {children as never}
    </View>
  );
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

function parseTags(value: string) {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function mergeTagInput(currentValue: string, tag: string) {
  const tags = parseTags(currentValue);
  if (tags.some((value) => value.toLocaleLowerCase('zh-CN') === tag.toLocaleLowerCase('zh-CN'))) {
    return currentValue;
  }

  return [...tags, tag].join(', ');
}

function resolveImageUri(url: string) {
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  if (url.startsWith('/api/')) {
    try {
      return `${new URL(getMobileApiBaseUrl()).origin}${url}`;
    } catch {
      return url;
    }
  }

  return url;
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
  maxHeight: '92%' as const,
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

const closeButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 999,
  backgroundColor: palette.surfaceMuted,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const formContentStyle = {
  padding: 18,
  gap: 16,
};

const segmentedStyle = {
  flexDirection: 'row' as const,
  borderRadius: 15,
  backgroundColor: palette.canvasStrong,
  padding: 4,
  gap: 4,
};

const segmentButtonStyle = {
  flex: 1,
  borderRadius: 12,
  paddingVertical: 10,
  alignItems: 'center' as const,
};

const activeSegmentStyle = {
  backgroundColor: palette.surface,
  ...shadows.sm,
};

const segmentTextStyle = {
  fontSize: 14,
  fontWeight: '700' as const,
  color: palette.textSoft,
};

const activeSegmentTextStyle = {
  fontSize: 14,
  fontWeight: '800' as const,
  color: palette.text,
};

const fieldStyle = {
  gap: 8,
};

const fieldLabelStyle = {
  fontSize: 14,
  fontWeight: '700' as const,
  color: palette.textMuted,
};

const inputStyle = {
  minHeight: 48,
  borderRadius: 15,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: palette.text,
};

const inputButtonStyle = {
  minHeight: 48,
  borderRadius: 15,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 14,
  paddingVertical: 13,
  justifyContent: 'center' as const,
};

const inputButtonTextStyle = {
  color: palette.text,
  fontSize: 15,
  fontWeight: '700' as const,
};

const inputButtonPlaceholderStyle = {
  color: palette.textSoft,
  fontSize: 15,
};

const dateClearButtonStyle = {
  alignSelf: 'flex-start' as const,
  paddingVertical: 2,
};

const dateClearTextStyle = {
  color: palette.textSoft,
  fontSize: 13,
  fontWeight: '700' as const,
};

const multilineInputStyle = {
  minHeight: 84,
  textAlignVertical: 'top' as const,
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
  borderColor: '#7dd3fc',
  backgroundColor: palette.brandTint,
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

const switchRowStyle = {
  minHeight: 64,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 14,
  paddingVertical: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
};

const switchRowActiveStyle = {
  borderColor: '#bae6fd',
  backgroundColor: '#f0f9ff',
};

const switchTitleStyle = {
  fontSize: 14,
  fontWeight: '800' as const,
  color: palette.text,
};

const switchDescriptionStyle = {
  marginTop: 2,
  fontSize: 12,
  color: palette.textSoft,
};

const switchTrackStyle = {
  width: 46,
  height: 26,
  borderRadius: 999,
  backgroundColor: '#cbd5e1',
  padding: 3,
};

const switchTrackActiveStyle = {
  backgroundColor: palette.brand,
};

const switchThumbStyle = {
  width: 20,
  height: 20,
  borderRadius: 999,
  backgroundColor: '#ffffff',
};

const switchThumbActiveStyle = {
  transform: [{ translateX: 20 }],
};

const fieldGridStyle = {
  flexDirection: 'row' as const,
  gap: 12,
};

const secondaryButtonStyle = {
  borderRadius: 15,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  paddingVertical: 13,
  alignItems: 'center' as const,
};

const secondaryButtonTextStyle = {
  fontSize: 15,
  fontWeight: '700' as const,
  color: palette.text,
};

const imageCardStyle = {
  gap: 8,
};

const imageStyle = {
  width: 112,
  height: 112,
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
  fontWeight: '700' as const,
};

const emptyHintStyle = {
  color: palette.textSoft,
  fontSize: 14,
};

const errorTextStyle = {
  color: palette.danger,
  fontSize: 14,
};

const sheetFooterStyle = {
  flexDirection: 'row' as const,
  gap: 12,
  paddingHorizontal: 18,
  paddingTop: 12,
  paddingBottom: 18,
  borderTopWidth: 1,
  borderTopColor: palette.borderSoft,
  backgroundColor: palette.surface,
};

const footerSecondaryButtonStyle = {
  flex: 1,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  paddingVertical: 14,
  alignItems: 'center' as const,
};

const footerSecondaryTextStyle = {
  fontSize: 15,
  fontWeight: '700' as const,
  color: palette.text,
};

const footerPrimaryButtonStyle = {
  flex: 1,
  borderRadius: 16,
  backgroundColor: palette.brand,
  paddingVertical: 14,
  alignItems: 'center' as const,
};

const footerPrimaryTextStyle = {
  fontSize: 15,
  fontWeight: '800' as const,
  color: '#ffffff',
};

const disabledStyle = {
  opacity: 0.55,
};
