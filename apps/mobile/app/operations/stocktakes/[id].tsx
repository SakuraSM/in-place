import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, Pressable, Switch, Text, View } from 'react-native';
import type { StocktakeEntry } from '@inplace/domain';
import { parseInventoryCode } from '@inplace/app-core';
import { codesApi, stocktakesApi } from '@/shared/api/mobileClient';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';

export default function StocktakeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [reconcileMoves, setReconcileMoves] = useState(true);
  const [reconcileQuantities, setReconcileQuantities] = useState(true);

  const sessionQuery = useQuery({
    queryKey: ['mobile', 'stocktake', id],
    enabled: Boolean(id),
    queryFn: () => stocktakesApi.fetch(id),
  });
  const countMutation = useMutation({
    mutationFn: ({ entry, quantity }: { entry: StocktakeEntry; quantity: number }) => (
      stocktakesApi.countItem({
        stocktakeId: id,
        itemId: entry.item_id,
        countedQuantity: Math.max(0, quantity),
        foundParentId: entry.found_parent_id,
      })
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'stocktake', id] });
    },
    onError: (error) => notify({
      tone: 'error',
      title: '盘点数量保存失败',
      description: error instanceof Error ? error.message : '原数量已保留',
    }),
  });
  const completeMutation = useMutation({
    mutationFn: () => stocktakesApi.complete({ stocktakeId: id, reconcileMoves, reconcileQuantities }),
    onSuccess: async () => {
      setCompleteOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mobile', 'stocktake', id] }),
        queryClient.invalidateQueries({ queryKey: ['mobile', 'stocktakes'] }),
        queryClient.invalidateQueries({ queryKey: ['mobile', 'home'] }),
      ]);
      notify({ tone: 'success', title: '盘点已完成' });
    },
    onError: (error) => notify({
      tone: 'error',
      title: '完成盘点失败',
      description: error instanceof Error ? error.message : '盘点进度已保留',
    }),
  });

  const session = sessionQuery.data;
  const handleScannedItem = useCallback(async (itemId: string) => {
    if (!session) return;
    const entry = session.entries.find((candidate) => candidate.item_id === itemId);
    if (!entry) {
      try {
        await stocktakesApi.countItem({
          stocktakeId: id,
          itemId,
          countedQuantity: 1,
          foundParentId: session.location_id,
        });
        await queryClient.invalidateQueries({ queryKey: ['mobile', 'stocktake', id] });
        notify({ tone: 'info', title: '已记录清单外物品', description: '完成盘点前可继续调整数量。' });
      } catch (error) {
        notify({ tone: 'error', title: '清单外物品记录失败', description: error instanceof Error ? error.message : '请重新扫描' });
      }
      return;
    }
    await countMutation.mutateAsync({
      entry,
      quantity: Math.max(entry.counted_quantity ?? 0, 1),
    });
    notify({ tone: 'success', title: `${entry.item.name} 已核对` });
  }, [countMutation, id, notify, queryClient, session]);

  if (sessionQuery.isLoading) return <Screen><StateBlock title="加载盘点详情" loading /></Screen>;
  if (sessionQuery.isError || !session) {
    return <Screen><StateBlock title="盘点加载失败" body={sessionQuery.error instanceof Error ? sessionQuery.error.message : '盘点不存在'} /></Screen>;
  }

  const countedCount = session.entries.filter((entry) => entry.counted_quantity !== null).length;
  const isCompleted = session.status === 'completed';

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Stack.Screen options={{ title: session.location.name, headerShown: true }} />
      <SectionCard
        title={session.location.name}
        subtitle={`${countedCount} / ${session.entries.length} 已核对`}
        density="compact"
      >
        {!isCompleted ? (
          <View style={actionRowStyle}>
            <Pressable onPress={() => setScannerOpen(true)} style={primaryButtonStyle}>
              <Ionicons name="scan" size={18} color="#ffffff" />
              <Text style={primaryButtonTextStyle}>扫码核对</Text>
            </Pressable>
            <Pressable onPress={() => setCompleteOpen(true)} style={secondaryButtonStyle}>
              <Text style={secondaryButtonTextStyle}>完成盘点</Text>
            </Pressable>
          </View>
        ) : <Text style={completedTextStyle}>盘点已完成，结果只读。</Text>}
      </SectionCard>

      <SectionCard title={`核对清单 ${session.entries.length}`} density="dense" headerMode="compact">
        {session.entries.map((entry) => (
          <CompactListRow
            key={entry.id}
            title={entry.item.name}
            subtitle={`预期 ${entry.expected_quantity} · ${entry.status === 'missing' ? '缺失' : entry.status === 'unexpected' ? '清单外' : '待核对'}`}
            meta={`${entry.counted_quantity ?? '—'}`}
            iconName={entry.counted_quantity === null ? 'ellipse-outline' : 'checkmark-circle-outline'}
            right={!isCompleted ? (
              <View style={quantityRowStyle}>
                <Pressable
                  accessibilityLabel={`减少${entry.item.name}数量`}
                  disabled={countMutation.isPending}
                  onPress={() => countMutation.mutate({ entry, quantity: (entry.counted_quantity ?? 0) - 1 })}
                  style={quantityButtonStyle}
                >
                  <Ionicons name="remove" size={17} color={palette.textMuted} />
                </Pressable>
                <Text style={quantityTextStyle}>{entry.counted_quantity ?? 0}</Text>
                <Pressable
                  accessibilityLabel={`增加${entry.item.name}数量`}
                  disabled={countMutation.isPending}
                  onPress={() => countMutation.mutate({ entry, quantity: (entry.counted_quantity ?? 0) + 1 })}
                  style={quantityButtonStyle}
                >
                  <Ionicons name="add" size={17} color={palette.textMuted} />
                </Pressable>
              </View>
            ) : undefined}
          />
        ))}
      </SectionCard>

      <StocktakeScanner
        visible={scannerOpen}
        busy={scannerBusy}
        onBusyChange={setScannerBusy}
        onClose={() => setScannerOpen(false)}
        onResolveItem={handleScannedItem}
      />
      <BottomSheet visible={completeOpen} title="完成盘点" onClose={() => setCompleteOpen(false)}>
        <Text style={completedTextStyle}>确认差异并选择需要回写的库存信息。</Text>
        <View style={reconcilePanelStyle}>
          <ReconcileOption label="按发现位置移动物品" value={reconcileMoves} onChange={setReconcileMoves} />
          <ReconcileOption label="按盘点数更新数量" value={reconcileQuantities} onChange={setReconcileQuantities} />
        </View>
        <Pressable
          disabled={completeMutation.isPending}
          onPress={() => completeMutation.mutate()}
          style={primaryButtonStyle}
        >
          <Text style={primaryButtonTextStyle}>{completeMutation.isPending ? '完成中…' : '确认并完成盘点'}</Text>
        </Pressable>
      </BottomSheet>
    </Screen>
  );
}

function StocktakeScanner({
  visible,
  busy,
  onBusyChange,
  onClose,
  onResolveItem,
}: {
  visible: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
  onResolveItem: (itemId: string) => Promise<void>;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const handleBarcode = async (result: BarcodeScanningResult) => {
    if (busy) return;
    const code = parseInventoryCode(result.data);
    if (!code) return;
    onBusyChange(true);
    try {
      const resolved = await codesApi.resolveCode(code);
      if (resolved.item) await onResolveItem(resolved.item.id);
    } finally {
      setTimeout(() => onBusyChange(false), 800);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={scannerRootStyle}>
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={busy ? undefined : (result) => void handleBarcode(result)}
          />
        ) : (
          <View style={scannerPermissionStyle}>
            <Text style={completedTextStyle}>需要相机权限才能扫码核对。</Text>
            <Pressable onPress={() => void requestPermission()} style={primaryButtonStyle}>
              <Text style={primaryButtonTextStyle}>允许相机</Text>
            </Pressable>
          </View>
        )}
        <Pressable onPress={onClose} style={scannerCloseStyle}>
          <Text style={primaryButtonTextStyle}>结束扫码</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function ReconcileOption({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={reconcileRowStyle}>
      <Text style={secondaryButtonTextStyle}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: palette.brand }} />
    </View>
  );
}

const actionRowStyle = { flexDirection: 'row' as const, gap: 10 };
const primaryButtonStyle = {
  flex: 1,
  minHeight: 46,
  borderRadius: 15,
  backgroundColor: palette.brand,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 7,
};
const primaryButtonTextStyle = { fontSize: 14, fontWeight: '900' as const, color: '#ffffff' };
const secondaryButtonStyle = {
  flex: 1,
  minHeight: 46,
  borderRadius: 15,
  backgroundColor: palette.canvasStrong,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
const secondaryButtonTextStyle = { fontSize: 14, fontWeight: '800' as const, color: palette.text };
const completedTextStyle = { fontSize: 14, lineHeight: 20, color: palette.textMuted };
const quantityRowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 };
const quantityButtonStyle = {
  width: 30,
  height: 30,
  borderRadius: 10,
  backgroundColor: palette.canvasStrong,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
const quantityTextStyle = { minWidth: 24, textAlign: 'center' as const, fontSize: 14, fontWeight: '900' as const, color: palette.text };
const scannerRootStyle = { flex: 1, backgroundColor: '#020617' };
const scannerPermissionStyle = { flex: 1, padding: 24, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 16, backgroundColor: palette.canvas };
const scannerCloseStyle = { minHeight: 58, backgroundColor: palette.brandStrong, alignItems: 'center' as const, justifyContent: 'center' as const };
const reconcilePanelStyle = {
  gap: 8,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  padding: 12,
};
const reconcileRowStyle = { minHeight: 42, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 12 };
