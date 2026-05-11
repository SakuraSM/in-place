import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { palette } from '@/shared/ui/theme';
import {
  exportInventoryFile,
  importInventoryBackup,
  pickInventoryBackupFile,
  type InventoryFileExportResult,
  type PendingInventoryBackup,
} from '@/features/profile/mobileDataManagement';

export default function DataManagementScreen() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingBackup, setPendingBackup] = useState<PendingInventoryBackup | null>(null);
  const [pendingImportName, setPendingImportName] = useState<string | null>(null);
  const [pendingImportSummary, setPendingImportSummary] = useState<{ categories: number; tags: number; items: number } | null>(null);

  const exportJsonMutation = useMutation({
    mutationFn: () => exportInventoryFile('json'),
    onSuccess: (result) => {
      setMessage(getExportSuccessMessage('JSON 备份', result));
    },
  });

  const exportCsvMutation = useMutation({
    mutationFn: () => exportInventoryFile('csv'),
    onSuccess: (result) => {
      setMessage(getExportSuccessMessage('CSV 导出', result));
    },
  });

  const pickImportMutation = useMutation({
    mutationFn: () => pickInventoryBackupFile(),
    onSuccess: (result) => {
      if (result.canceled) {
        return;
      }

      setMessage(null);
      setPendingBackup(result.backup);
    },
  });

  const importMutation = useMutation({
    mutationFn: () => {
      if (!pendingBackup) {
        throw new Error('请先选择 JSON 备份文件');
      }

      return importInventoryBackup(pendingBackup);
    },
    onSuccess: async (result) => {
      setPendingBackup(null);
      setPendingImportName(result.fileName);
      setPendingImportSummary(result.summary);
      setMessage(`备份「${result.fileName}」已导入`);
      await queryClient.invalidateQueries({ queryKey: ['mobile'] });
    },
  });

  const activeExport = exportJsonMutation.isPending || exportCsvMutation.isPending;
  const busy = activeExport || pickImportMutation.isPending || importMutation.isPending;

  return (
    <Screen scroll contentInsetMode="form" chrome="muted">
      <BrandHeader title="数据管理" variant="page" />

      <SectionCard title="导出" delay={60} density="compact">
        <Pressable onPress={() => void exportJsonMutation.mutateAsync()} disabled={busy} style={primaryButtonStyle}>
          {exportJsonMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>导出 JSON 备份</Text>}
        </Pressable>
        <Pressable onPress={() => void exportCsvMutation.mutateAsync()} disabled={busy} style={secondaryButtonStyle}>
          {exportCsvMutation.isPending ? <ActivityIndicator /> : <Text style={secondaryButtonTextStyle}>导出 CSV 表格</Text>}
        </Pressable>
      </SectionCard>

      <SectionCard title="导入 JSON" subtitle="会覆盖当前数据" delay={120} density="compact" tone="muted">
        <Pressable onPress={() => void pickImportMutation.mutateAsync()} disabled={busy} style={primaryButtonStyle}>
          {pickImportMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>选择 JSON 备份</Text>}
        </Pressable>
      </SectionCard>

      {message ? <Text style={successTextStyle}>{message}</Text> : null}
      {exportJsonMutation.isError ? <Text style={errorTextStyle}>{exportJsonMutation.error instanceof Error ? exportJsonMutation.error.message : 'JSON 导出失败'}</Text> : null}
      {exportCsvMutation.isError ? <Text style={errorTextStyle}>{exportCsvMutation.error instanceof Error ? exportCsvMutation.error.message : 'CSV 导出失败'}</Text> : null}
      {pickImportMutation.isError ? <Text style={errorTextStyle}>{pickImportMutation.error instanceof Error ? pickImportMutation.error.message : 'JSON 文件读取失败'}</Text> : null}
      {importMutation.isError ? <Text style={errorTextStyle}>{importMutation.error instanceof Error ? importMutation.error.message : 'JSON 导入失败'}</Text> : null}

      <ConfirmDialog
        visible={Boolean(pendingBackup)}
        title="导入 JSON 备份"
        message={`导入「${pendingBackup?.fileName ?? ''}」？当前数据会被覆盖。`}
        confirmLabel={importMutation.isPending ? '导入中...' : '确认导入'}
        danger
        loading={importMutation.isPending}
        onCancel={() => {
          if (!importMutation.isPending) {
            setPendingBackup(null);
          }
        }}
        onConfirm={() => void importMutation.mutateAsync()}
      />

      <ConfirmDialog
        visible={Boolean(pendingImportSummary)}
        title="导入完成"
        message={`已导入「${pendingImportName ?? ''}」。分类 ${pendingImportSummary?.categories ?? 0} 个，标签 ${pendingImportSummary?.tags ?? 0} 个，物品 ${pendingImportSummary?.items ?? 0} 个。`}
        confirmLabel="知道了"
        onCancel={() => {
          setPendingImportName(null);
          setPendingImportSummary(null);
        }}
        onConfirm={() => {
          setPendingImportName(null);
          setPendingImportSummary(null);
        }}
      />
    </Screen>
  );
}

const primaryButtonStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.brand,
  borderRadius: 14,
  paddingVertical: 13,
};

const primaryButtonTextStyle = {
  color: '#ffffff',
  fontWeight: '600' as const,
};

const secondaryButtonStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.surface,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.border,
  paddingVertical: 13,
};

const secondaryButtonTextStyle = {
  color: palette.text,
  fontWeight: '600' as const,
};

function getExportSuccessMessage(label: string, result: InventoryFileExportResult): string {
  if (result.shared) {
    return `${label}已准备好，可直接分享或保存。`;
  }

  return `${label}已保存到本机缓存目录，但当前设备暂不支持系统分享。`;
}

const successTextStyle = {
  color: '#15803d',
  fontSize: 14,
};

const errorTextStyle = {
  color: palette.danger,
  fontSize: 14,
};
