import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getMobileApiBaseUrl, mobileApiClient } from '@/shared/api/mobileClient';
import { secureTokenStorage } from '@/platform/auth/secureTokenStorage';

export interface PendingInventoryBackup {
  fileName: string;
  payload: Record<string, unknown>;
}

export interface InventoryFileExportResult {
  fileUri: string;
  shared: boolean;
}

const INVENTORY_BACKUP_PICKER_TYPE = '*/*';

export async function exportInventoryFile(format: 'json' | 'csv'): Promise<InventoryFileExportResult> {
  const token = await secureTokenStorage.get();
  const response = await fetch(`${getMobileApiBaseUrl()}/v1/items/export?format=${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    let message = '导出失败';
    try {
      const payload = await response.json() as { message?: string };
      message = payload.message ?? message;
    } catch {
      const text = await response.text();
      message = text || message;
    }

    throw new Error(message);
  }

  const fileContents = await response.text();
  const extension = format === 'json' ? 'json' : 'csv';
  const mimeType = format === 'json' ? 'application/json' : 'text/csv';
  if (!FileSystem.cacheDirectory) {
    throw new Error('当前设备不可用缓存目录，暂时无法导出文件');
  }

  const targetUri = `${FileSystem.cacheDirectory}inplace-export-${Date.now()}.${extension}`;

  await FileSystem.writeAsStringAsync(targetUri, fileContents, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return {
      shared: false,
      fileUri: targetUri,
    };
  }

  await Sharing.shareAsync(targetUri, {
    mimeType,
    dialogTitle: format === 'json' ? '分享 JSON 备份' : '分享 CSV 导出',
  });

  return {
    shared: true,
    fileUri: targetUri,
  };
}

export async function pickInventoryBackupFile(): Promise<
  | { canceled: true }
  | { canceled: false; backup: PendingInventoryBackup }
> {
  const result = await DocumentPicker.getDocumentAsync({
    type: INVENTORY_BACKUP_PICKER_TYPE,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) {
    return {
      canceled: true as const,
    };
  }

  const asset = result.assets[0];
  const fileContents = await FileSystem.readAsStringAsync(asset.uri);
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(fileContents) as Record<string, unknown>;
  } catch {
    throw new Error('文件无法解析，请选择归位导出的 JSON 备份');
  }

  return {
    canceled: false,
    backup: {
      fileName: asset.name,
      payload: parsed,
    },
  };
}

export async function importInventoryBackup(backup: PendingInventoryBackup) {
  const response = await mobileApiClient.request<{ data: { categories: number; tags: number; items: number } }>('/v1/items/import', {
    method: 'POST',
    body: JSON.stringify(backup.payload),
  });

  return {
    fileName: backup.fileName,
    summary: response.data,
  };
}
