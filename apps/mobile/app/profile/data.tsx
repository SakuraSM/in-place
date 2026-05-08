import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { palette } from '@/shared/ui/theme';
import { exportInventoryFile, pickAndImportInventoryBackup } from '@/features/profile/mobileDataManagement';

export default function DataManagementScreen() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingImportName, setPendingImportName] = useState<string | null>(null);
  const [pendingImportSummary, setPendingImportSummary] = useState<{ categories: number; tags: number; items: number } | null>(null);

  const exportJsonMutation = useMutation({
    mutationFn: () => exportInventoryFile('json'),
    onSuccess: () => {
      setError(null);
      setMessage('JSON 备份已准备好，可直接分享或保存。');
    },
  });

  const exportCsvMutation = useMutation({
    mutationFn: () => exportInventoryFile('csv'),
    onSuccess: () => {
      setError(null);
      setMessage('CSV 导出已准备好，可直接分享或保存。');
    },
  });

  const importMutation = useMutation({
    mutationFn: () => pickAndImportInventoryBackup(),
    onSuccess: async (result) => {
      if (result.canceled) {
        return;
      }

      setError(null);
      setPendingImportName(result.fileName);
      setPendingImportSummary(result.summary);
      setMessage(`备份「${result.fileName}」已导入`);
      await queryClient.invalidateQueries({ queryKey: ['mobile'] });
    },
  });

  const activeExport = exportJsonMutation.isPending || exportCsvMutation.isPending;

  return (
    <Screen scroll contentInsetMode="form" chrome="muted">
      <BrandHeader title="数据管理" subtitle="移动端现在也可以导出 JSON / CSV，并导入 JSON 备份。" variant="page" />

      <SectionCard title="数据导出" subtitle="按用途选择完整备份或表格导出。" delay={60} density="compact">
        <Pressable onPress={() => void exportJsonMutation.mutateAsync()} disabled={activeExport || importMutation.isPending} style={primaryButtonStyle}>
          {exportJsonMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>导出 JSON 备份</Text>}
        </Pressable>
        <Pressable onPress={() => void exportCsvMutation.mutateAsync()} disabled={activeExport || importMutation.isPending} style={secondaryButtonStyle}>
          {exportCsvMutation.isPending ? <ActivityIndicator /> : <Text style={secondaryButtonTextStyle}>导出 CSV 表格</Text>}
        </Pressable>
      </SectionCard>

      <SectionCard title="JSON 备份导入" subtitle="选择归位导出的 JSON 备份文件，导入会覆盖当前账号数据。" delay={120} density="compact" tone="muted">
        <Pressable onPress={() => void importMutation.mutateAsync()} disabled={importMutation.isPending || activeExport} style={primaryButtonStyle}>
          {importMutation.isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={primaryButtonTextStyle}>选择并导入 JSON</Text>}
        </Pressable>
      </SectionCard>

      {message ? <Text style={successTextStyle}>{message}</Text> : null}
      {error ? <Text style={errorTextStyle}>{error}</Text> : null}
      {exportJsonMutation.isError ? <Text style={errorTextStyle}>{exportJsonMutation.error instanceof Error ? exportJsonMutation.error.message : 'JSON 导出失败'}</Text> : null}
      {exportCsvMutation.isError ? <Text style={errorTextStyle}>{exportCsvMutation.error instanceof Error ? exportCsvMutation.error.message : 'CSV 导出失败'}</Text> : null}
      {importMutation.isError ? <Text style={errorTextStyle}>{importMutation.error instanceof Error ? importMutation.error.message : 'JSON 导入失败'}</Text> : null}

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

const successTextStyle = {
  color: '#15803d',
  fontSize: 14,
};

const errorTextStyle = {
  color: palette.danger,
  fontSize: 14,
};
