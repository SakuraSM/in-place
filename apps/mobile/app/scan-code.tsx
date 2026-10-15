import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { parseInventoryCode } from '@inplace/app-core';
import { codesApi, itemsApi } from '@/shared/api/mobileClient';
import { useHousehold } from '@/providers/HouseholdProvider';
import { ManualCodeSheet } from '@/features/scan/ManualCodeSheet';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { InventoryIcon } from '@/shared/ui/InventoryIcon';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CodeScanScreen() {
  const insets = useSafeAreaInsets();
  const { canEditInventory, currentHouseholdId } = useHousehold();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const busyRef = useRef(false);
  const cooldown = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (cooldown.current) clearTimeout(cooldown.current); }, []);
  const [message, setMessage] = useState('扫描物品进入详情；扫描位置后继续扫描物品即可归位。');
  const [destination, setDestination] = useState<Item | null>(null);
  const [movedIds, setMovedIds] = useState<Set<string>>(() => new Set());
  const [unboundCode, setUnboundCode] = useState<string | null>(null);
  const bindableItemsQuery = useQuery({
    queryKey: ['mobile', 'code-bind-items', currentHouseholdId],
    enabled: canEditInventory && Boolean(unboundCode),
    queryFn: fetchBindableItems,
  });

  const handleCode = useCallback(async (raw: string) => {
    if (busyRef.current) throw new Error('正在处理上一个标签，请稍后再试');
    const code = parseInventoryCode(raw);
    if (!code) {
      throw new Error('这不是有效的归位标签');
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const resolved = await codesApi.resolveCode(code);
      const scannedItem = resolved.item;
      if (!scannedItem) {
        if (!canEditInventory) {
          throw new Error('这是未绑定标签；当前家庭为只读，无法绑定。');
        }
        setUnboundCode(code);
        setMessage('这是未绑定标签，请选择要绑定的位置、收纳或物品。');
        return;
      }

      if (destination) {
        if (scannedItem.type !== 'item') {
          throw new Error('请继续扫描物品标签');
        }
        if (movedIds.has(scannedItem.id)) {
          setMessage(`${scannedItem.name} 已在本次归位清单中`);
          return;
        }
        await itemsApi.updateItem(scannedItem.id, { parent_id: destination.id });
        setMovedIds((current) => new Set(current).add(scannedItem.id));
        setMessage(`${scannedItem.name} 已归位到 ${destination.name}`);
        return;
      }

      if (canEditInventory && (resolved.entityKind === 'location' || resolved.entityKind === 'container')) {
        setDestination(scannedItem);
        setMessage(`目标位置：${scannedItem.name}。请连续扫描要归位的物品。`);
        return;
      }
      router.replace(`/item/${scannedItem.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '扫码失败，请重试');
      throw error;
    } finally {
      cooldown.current = setTimeout(() => { busyRef.current = false; setBusy(false); }, 900);
    }
  }, [canEditInventory, destination, movedIds]);

  const handleBind = async (item: Item) => {
    if (!unboundCode) return;
    try {
      await codesApi.bindCode(unboundCode, item.id);
      setUnboundCode(null);
      setMessage(`标签已绑定到 ${item.name}`);
      notify({ tone: 'success', title: '标签绑定成功', description: item.name });
      await queryClient.invalidateQueries({ queryKey: ['mobile'] });
    } catch (error) {
      notify({ tone: 'error', title: '标签绑定失败', description: error instanceof Error ? error.message : '请稍后重试' });
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }] }>
      {permission?.granted ? <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy || manualOpen || Boolean(unboundCode) ? undefined : (result) => void handleCode(result.data).catch((error: unknown) => setMessage(error instanceof Error ? error.message : '扫码失败'))}
      /> : <View style={styles.center}>
        <Text style={styles.title}>扫码或输入标签</Text><Text style={styles.description}>相机只用于识别归位二维码，也可以直接输入或粘贴标签。</Text>
        <Pressable accessibilityRole="button" onPress={() => void requestPermission()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>允许使用相机</Text></Pressable>
      </View>}
      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) + 16 }] }>
        <View style={styles.panelHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>返回</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{destination ? `归位到 ${destination.name}` : '扫描 InPlace 标签'}</Text>
            <Text style={styles.description}>{message}</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setManualOpen(true)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>输入或粘贴标签</Text></Pressable>
        {destination ? <Text style={styles.count}>本次已归位 {movedIds.size} 件</Text> : null}
        {canEditInventory ? <Pressable onPress={() => { setDestination(null); setMovedIds(new Set()); setMessage('已重置扫描目标'); }} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>重置目标</Text>
        </Pressable> : null}
      </View>
      <ManualCodeSheet visible={manualOpen} onClose={() => setManualOpen(false)} onSubmit={handleCode} />
      <BottomSheet visible={Boolean(unboundCode)} title="绑定未使用标签" onClose={() => setUnboundCode(null)}>
        <Text style={styles.description}>选择一个对象。绑定后再次扫描即可查看或归位。</Text>
        {bindableItemsQuery.isLoading ? <Text style={styles.description}>正在加载库存…</Text> : null}
        {bindableItemsQuery.data?.map((item) => (
          <Pressable key={item.id} onPress={() => void handleBind(item)}>
            <CompactListRow
              title={item.name}
              subtitle={item.type === 'item' ? '物品' : '位置 / 收纳'}
              icon={<InventoryIcon type={item.type} size="sm" />}
              iconFramed={false}
              chevron
            />
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}

async function fetchBindableItems(): Promise<Item[]> {
  return itemsApi.searchItems('', '');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020617' },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: palette.canvas },
  panel: { padding: 20, paddingBottom: 34, backgroundColor: palette.surface },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  backButton: { minWidth: 48, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceMuted },
  backButtonText: { color: palette.brandStrong, fontSize: 14, fontWeight: '800' },
  title: { color: palette.text, fontSize: 20, fontWeight: '800' },
  description: { marginTop: 6, color: palette.textSoft, fontSize: 14, lineHeight: 21 },
  count: { marginTop: 10, color: palette.brandStrong, fontSize: 14, fontWeight: '700' },
  primaryButton: { marginTop: 8, borderRadius: 16, backgroundColor: palette.brandStrong, paddingHorizontal: 18, paddingVertical: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { marginTop: 14, alignSelf: 'flex-start', borderRadius: 14, backgroundColor: palette.surfaceMuted, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryButtonText: { color: palette.text, fontWeight: '700' },
});
