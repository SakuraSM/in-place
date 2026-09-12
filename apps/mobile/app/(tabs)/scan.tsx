import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import type { AIRecognitionResult } from '@inplace/domain';
import { BatchOperationError } from '@inplace/app-core';
import { applySavedRecognitionDrafts, saveRecognitionDrafts } from '@/features/scan/saveRecognitionDrafts';
import { useAuth } from '@/providers/AuthProvider';
import { useHousehold } from '@/providers/HouseholdProvider';
import { aiApi, itemsApi, recognizeItemsFromUri, uploadImageFromUri } from '@/shared/api/mobileClient';
import { getMediaLibraryPermissionError } from '@/shared/lib/imagePickerPermission';
import { ScanCropSheet } from '@/features/scan/ScanCropSheet';
import { ScanRecognitionResults, type DraftRecognition } from '@/features/scan/ScanRecognitionResults';
import { cropImageFromUri, fullImageCropBox, normalizeBoundingBox, type NormalizedCropBox, type ScanSourceImage } from '@/features/scan/scanImageCrop';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { HouseholdButton } from '@/shared/ui/HouseholdButton';
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
  const { canEditInventory, currentHouseholdId } = useHousehold();
  const queryClient = useQueryClient();
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);
  const [drafts, setDrafts] = useState<DraftRecognition[]>([]);
  const [croppingDraftId, setCroppingDraftId] = useState<string | null>(null);
  const [cropSaving, setCropSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const saveGuard = useRef(false);

  const aiStatusQuery = useQuery({
    queryKey: ['mobile', 'ai-status', currentHouseholdId, user?.id],
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

      if (!canEditInventory) throw new Error('当前家庭为只读，无法保存库存');
      return saveRecognitionDrafts({ drafts, userId: user.id, upload: uploadImageFromUri, create: itemsApi.createItem });
    },
    onSuccess: async (result) => {
      setDrafts((current) => applySavedRecognitionDrafts(current, result));
      setMessage(result.succeeded.length > 0 ? `已保存 ${result.succeeded.length} 项` : null);
      setError(result.failed.length > 0 ? new BatchOperationError(result).message : null);
      await queryClient.invalidateQueries({ queryKey: ['mobile'] });
    },
  });

  const pickImage = async () => {
    setError(null);
    setMessage(null);
    setDrafts([]);

    const permissionError = await getMediaLibraryPermissionError();
    if (permissionError) {
      setError(permissionError);
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
    if (saveGuard.current) return;
    saveGuard.current = true;
    setError(null);
    setMessage(null);

    try {
      await saveMutation.mutateAsync();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '保存失败');
    } finally {
      saveGuard.current = false;
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
    return (
      <Screen>
        <StateBlock title="拍照录入暂不可用" body="仍可扫描 InPlace 标签整理已有库存。" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="扫标签归位"
          onPress={() => router.push('/scan-code' as Href)}
          style={primaryButtonStyle}
        >
          <Text style={primaryButtonTextStyle}>扫标签归位</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Entrance variant="page">
        <BrandHeader title="拍照录入" subtitle="识别照片，确认后新建库存" variant="page" accessory={<HouseholdButton compact />} />
      </Entrance>

      <SectionCard
        title="已有 InPlace 标签？"
        subtitle="无需识别照片，直接查看、绑定或归位已有库存"
        delay={40}
        density="compact"
        headerMode="compact"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="扫标签归位"
          onPress={() => router.push('/scan-code' as Href)}
          style={labelReturnButtonStyle}
        >
          <Text style={labelReturnButtonTextStyle}>扫标签归位</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="拍照或选图" delay={70} density="compact" headerMode="compact">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable disabled={recognizeMutation.isPending || saveMutation.isPending} onPress={() => void takePhoto()} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>拍照识别</Text>
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
          canSave={canEditInventory}
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

const labelReturnButtonStyle = {
  borderRadius: 15,
  borderWidth: 1,
  borderColor: palette.brand,
  backgroundColor: palette.surface,
  paddingVertical: 13,
  alignItems: 'center' as const,
};

const labelReturnButtonTextStyle = {
  color: palette.brandStrong,
  fontSize: 15,
  fontWeight: '700' as const,
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
