import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, ActivityIndicator, Pressable, Text, View } from 'react-native';
import { lifecycleApi, uploadAttachmentFromUri } from '@/shared/api/mobileClient';
import { useHousehold } from '@/providers/HouseholdProvider';
import { secureTokenStorage } from '@/platform/auth/secureTokenStorage';
import { SectionCard } from '@/shared/ui/SectionCard';
import { palette } from '@/shared/ui/theme';
import { resolveMobileUploadUri } from './mobileInventoryFormat';

const ACCEPTED_ATTACHMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-96) || `attachment-${Date.now()}`;
}

async function openProtectedAttachment(fileUrl: string, name: string, mimeType: string) {
  const resolvedUrl = resolveMobileUploadUri(fileUrl);
  if (!resolvedUrl) {
    throw new Error('附件地址无效');
  }
  if (!FileSystem.cacheDirectory) {
    throw new Error('当前设备不可用缓存目录');
  }

  const token = await secureTokenStorage.get();
  if (!token) {
    throw new Error('登录状态已失效，请重新登录');
  }

  const targetUri = `${FileSystem.cacheDirectory}${Date.now()}-${safeFileName(name)}`;
  const downloaded = await FileSystem.downloadAsync(resolvedUrl, targetUri, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (downloaded.status !== 200) {
    throw new Error('附件下载失败，请稍后重试');
  }
  if (!await Sharing.isAvailableAsync()) {
    throw new Error('当前设备暂不支持打开附件');
  }

  await Sharing.shareAsync(downloaded.uri, {
    mimeType,
    dialogTitle: `打开 ${name}`,
  });
}

export function MobileAttachmentsCard({ itemId, canEdit = true }: { itemId: string; canEdit?: boolean }) {
  const { currentHouseholdId } = useHousehold();
  const queryClient = useQueryClient();
  const attachmentsQuery = useQuery({
    queryKey: ['mobile', 'attachments', currentHouseholdId, itemId],
    queryFn: () => lifecycleApi.listAttachments(itemId),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['mobile', 'attachments', currentHouseholdId, itemId] });
  const uploadMutation = useMutation({
    mutationFn: async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_ATTACHMENT_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) {
        return false;
      }

      const asset = result.assets[0];
      const uploaded = await uploadAttachmentFromUri({
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType,
      });
      await lifecycleApi.createAttachment(itemId, {
        kind: 'other',
        name: uploaded.name || asset.name,
        fileUrl: uploaded.url,
        mimeType: uploaded.mimeType || asset.mimeType || 'application/octet-stream',
        sizeBytes: asset.size ?? 0,
      });
      return true;
    },
    onSuccess: async (created) => {
      if (created) await refresh();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => lifecycleApi.deleteAttachment(attachmentId),
    onSuccess: refresh,
  });
  const openMutation = useMutation({
    mutationFn: (attachment: { file_url: string; name: string; mime_type: string }) => (
      openProtectedAttachment(attachment.file_url, attachment.name, attachment.mime_type)
    ),
  });
  const error = uploadMutation.error ?? deleteMutation.error ?? openMutation.error ?? attachmentsQuery.error;
  const attachments = attachmentsQuery.data ?? [];

  return (
    <SectionCard title={`凭证与附件${attachments.length ? ` ${attachments.length}` : ''}`} delay={155} density="dense" headerMode="compact">
      {canEdit ? <Pressable
        accessibilityRole="button"
        accessibilityLabel="上传凭证或附件"
        disabled={uploadMutation.isPending}
        onPress={() => uploadMutation.mutate()}
        style={({ pressed }) => [uploadButtonStyle, pressed ? pressedStyle : null]}
      >
        {uploadMutation.isPending
          ? <ActivityIndicator size="small" color={palette.brandStrong} />
          : <Ionicons name="cloud-upload-outline" size={18} color={palette.brandStrong} />}
        <Text style={uploadButtonTextStyle}>{uploadMutation.isPending ? '上传中…' : '上传凭证'}</Text>
      </Pressable> : null}

      {error ? (
        <Text accessibilityRole="alert" style={errorStyle}>
          {error instanceof Error ? error.message : '附件操作失败，请重试'}
        </Text>
      ) : null}

      {attachmentsQuery.isLoading ? (
        <ActivityIndicator style={{ marginTop: 12 }} color={palette.brand} />
      ) : attachments.length > 0 ? (
        <View style={listStyle}>
          {attachments.map((attachment) => (
            <View key={attachment.id} style={rowStyle}>
              {canEdit ? <Pressable
                accessibilityRole="button"
                onPress={() => openMutation.mutate(attachment)}
                style={({ pressed }) => [fileButtonStyle, pressed ? pressedStyle : null]}
              >
                <Ionicons name="document-text-outline" size={20} color={palette.brand} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={fileNameStyle}>{attachment.name}</Text>
                  <Text numberOfLines={1} style={fileMetaStyle}>{attachment.mime_type || '附件'}</Text>
                </View>
              </Pressable> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`删除附件 ${attachment.name}`}
                hitSlop={8}
                onPress={() => {
                  Alert.alert('删除附件', `确认删除「${attachment.name}」？`, [
                    { text: '取消', style: 'cancel' },
                    { text: '删除', style: 'destructive', onPress: () => deleteMutation.mutate(attachment.id) },
                  ]);
                }}
                style={deleteButtonStyle}
              >
                <Ionicons name="trash-outline" size={18} color={palette.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={emptyStyle}>支持 PDF、图片、文本和 Word 文档，文件仅登录后可访问。</Text>
      )}
    </SectionCard>
  );
}

const uploadButtonStyle = {
  minHeight: 44,
  borderRadius: 14,
  backgroundColor: palette.brandTint,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  flexDirection: 'row' as const,
  gap: 8,
};
const uploadButtonTextStyle = { color: palette.brandStrong, fontSize: 14, fontWeight: '800' as const };
const listStyle = { marginTop: 12, gap: 8 };
const rowStyle = {
  minHeight: 56,
  borderRadius: 14,
  backgroundColor: palette.surfaceMuted,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  paddingLeft: 12,
  paddingRight: 8,
};
const fileButtonStyle = { minWidth: 0, flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 9 };
const fileNameStyle = { color: palette.text, fontSize: 14, fontWeight: '800' as const };
const fileMetaStyle = { marginTop: 2, color: palette.textSoft, fontSize: 11 };
const deleteButtonStyle = { width: 40, height: 40, alignItems: 'center' as const, justifyContent: 'center' as const };
const emptyStyle = { marginTop: 10, color: palette.textSoft, fontSize: 13, lineHeight: 19 };
const errorStyle = { marginTop: 10, color: palette.danger, fontSize: 13, lineHeight: 19 };
const pressedStyle = { opacity: 0.72 };
