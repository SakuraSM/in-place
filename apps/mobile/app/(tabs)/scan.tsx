import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import type { AIRecognitionResult, Item } from '@inplace/domain';
import { useAuth } from '@/providers/AuthProvider';
import { aiApi, itemsApi, recognizeItemsFromUri, uploadImageFromUri } from '@/shared/api/mobileClient';
import { ScanCropSheet } from '@/features/scan/ScanCropSheet';
import { ScanRecognitionResults, type DraftRecognition } from '@/features/scan/ScanRecognitionResults';
import { cropImageFromUri, fullImageCropBox, normalizeBoundingBox, type NormalizedCropBox, type ScanSourceImage } from '@/features/scan/scanImageCrop';
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
  width: number;
  height: number;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const CROPPED_IMAGE_MIME_TYPE = 'image/jpeg';

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

function toScanSourceImage(asset: SelectedAsset): ScanSourceImage {
  return {
    uri: asset.uri,
    width: Math.max(1, asset.width),
    height: Math.max(1, asset.height),
  };
}

function generateDraftId(result: AIRecognitionResult, position: number) {
  const normalizedName = result.name.trim().replace(/\s+/g, '-').toLowerCase() || 'scan';
  return `${Date.now()}-${position + 1}-${normalizedName}`;
}

async function createRecognitionDrafts(results: AIRecognitionResult[], asset: SelectedAsset): Promise<DraftRecognition[]> {
  const sourceImage = toScanSourceImage(asset);

  return Promise.all(results.map(async (result, position) => {
    const cropBox = normalizeBoundingBox(result) ?? fullImageCropBox();
    const croppedImage = await cropImageFromUri(sourceImage, cropBox);

    return {
      id: generateDraftId(result, position),
      result,
      selected: true,
      saved: false,
      editing: false,
      imageUri: croppedImage.uri,
      cropBox,
    };
  }));
}

export default function ScanTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);
  const [drafts, setDrafts] = useState<DraftRecognition[]>([]);
  const [croppingDraftId, setCroppingDraftId] = useState<string | null>(null);
  const [cropSaving, setCropSaving] = useState(false);
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

      const createdItems = await Promise.all(
        selectedDrafts.map(async (draft) => {
          const uploadedImageUrl = draft.imageUri
            ? await uploadImageFromUri({
              uri: draft.imageUri,
              fileName: `${draft.id}.jpg`,
              mimeType: CROPPED_IMAGE_MIME_TYPE,
            })
            : null;

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
      allowsEditing: false,
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
      width: asset.width,
      height: asset.height,
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
      allowsEditing: false,
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
      width: asset.width,
      height: asset.height,
    });
  };

  const handleRecognize = async () => {
    setError(null);
    setMessage(null);

    try {
      if (!selectedAsset) {
        throw new Error('请先选择图片');
      }

      const results = await recognizeMutation.mutateAsync();
      const nextDrafts = await createRecognitionDrafts(results, selectedAsset);
      setDrafts(nextDrafts);
      setCroppingDraftId(null);
      setMessage(results.length > 0 ? `识别完成，共 ${results.length} 个结果` : '未识别到可用结果');
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

  const toggleDraft = (draftId: string) => {
    setDrafts((current) => current.map((draft) => (
      draft.id === draftId ? { ...draft, selected: !draft.selected } : draft
    )));
  };

  const toggleDraftEditing = (draftId: string) => {
    setDrafts((current) => current.map((draft) => (
      draft.id === draftId ? { ...draft, editing: !draft.editing } : draft
    )));
  };

  const updateDraft = (draftId: string, updater: (draft: DraftRecognition) => DraftRecognition) => {
    setDrafts((current) => current.map((draft) => (
      draft.id === draftId ? updater(draft) : draft
    )));
  };

  const handleConfirmCrop = async (cropBox: NormalizedCropBox) => {
    if (!selectedAsset || !croppingDraftId) {
      return;
    }

    setCropSaving(true);
    setError(null);

    try {
      const croppedImage = await cropImageFromUri(toScanSourceImage(selectedAsset), cropBox);
      updateDraft(croppingDraftId, (draft) => ({
        ...draft,
        imageUri: croppedImage.uri,
        cropBox,
      }));
      setCroppingDraftId(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '裁剪失败，请重试');
    } finally {
      setCropSaving(false);
    }
  };

  if (aiStatusQuery.isLoading) {
    return <Screen><StateBlock title="检查 AI 状态" loading /></Screen>;
  }

  if (aiStatusQuery.isError) {
    return <Screen><StateBlock title="AI 状态失败" body={aiStatusQuery.error instanceof Error ? aiStatusQuery.error.message : '请稍后重试'} /></Screen>;
  }

  if (!aiStatusQuery.data) {
    return <Screen><StateBlock title="AI 未启用" body="先配置 AI" /></Screen>;
  }

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Entrance variant="page">
        <BrandHeader title="扫描" subtitle="拍照或选图识别" variant="page" />
      </Entrance>

      <SectionCard title="图片" delay={70} density="compact" headerMode="compact">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable disabled={recognizeMutation.isPending || saveMutation.isPending} onPress={() => void takePhoto()} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>拍照扫描</Text>
          </Pressable>
          <Pressable disabled={recognizeMutation.isPending || saveMutation.isPending} onPress={() => void pickImage()} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>选择图片</Text>
          </Pressable>
        </View>

        {selectedAsset ? (
          <Image source={{ uri: selectedAsset.uri }} style={previewStyle} />
        ) : (
          <View style={emptyPreviewStyle}><Text style={hintStyle}>未选择图片</Text></View>
        )}

        <View style={{ flexDirection: 'row' }}>
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

        {message ? <Text style={successStyle}>{message}</Text> : null}
        {error ? <Text style={errorStyle}>{error}</Text> : null}
      </SectionCard>

      <SectionCard title="识别结果" subtitle={drafts.length > 0 ? `${drafts.length} 个结果` : undefined} delay={150} density="compact" headerMode="compact">
        <ScanRecognitionResults
          drafts={drafts}
          saving={saveMutation.isPending}
          onSaveSelected={() => void handleSaveSelected()}
          onToggleDraft={toggleDraft}
          onToggleEditing={toggleDraftEditing}
          onChangeDraft={updateDraft}
          onCropDraft={setCroppingDraftId}
        />
      </SectionCard>

      <ScanCropSheet
        visible={Boolean(croppingDraftId)}
        sourceImage={selectedAsset ? toScanSourceImage(selectedAsset) : null}
        initialCropBox={drafts.find((draft) => draft.id === croppingDraftId)?.cropBox ?? null}
        saving={cropSaving}
        onClose={() => setCroppingDraftId(null)}
        onConfirm={(cropBox) => void handleConfirmCrop(cropBox)}
      />
    </Screen>
  );
}

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
  borderRadius: 15,
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
  borderRadius: 15,
  backgroundColor: palette.brand,
  paddingVertical: 13,
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
  aspectRatio: 16 / 10,
  borderRadius: 18,
  backgroundColor: palette.canvasStrong,
};

const emptyPreviewStyle = {
  minHeight: 112,
  borderRadius: 18,
  borderWidth: 1,
  borderStyle: 'dashed' as const,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
