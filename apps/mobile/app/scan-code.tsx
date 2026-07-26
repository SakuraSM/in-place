import { useCallback, useState } from 'react';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { parseInventoryCode } from '@inplace/app-core';
import { codesApi, itemsApi } from '@/shared/api/mobileClient';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { InventoryIcon } from '@/shared/ui/InventoryIcon';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';

export default function CodeScanScreen() {
  const queryClient = useQueryClient();
  const notify = useNotify();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('扫描物品进入详情；扫描位置后继续扫描物品即可归位。');
  const [destination, setDestination] = useState<Item | null>(null);
  const [movedIds, setMovedIds] = useState<Set<string>>(() => new Set());
  const [unboundCode, setUnboundCode] = useState<string | null>(null);
  const bindableItemsQuery = useQuery({
    queryKey: ['mobile', 'code-bind-items'],
    enabled: Boolean(unboundCode),
    queryFn: fetchBindableItems,
  });

  const handleBarcode = useCallback(async (result: BarcodeScanningResult) => {
    if (busy) return;
    const code = parseInventoryCode(result.data);
    if (!code) {
      setMessage('这不是有效的“归位”标签');
      return;
    }
    setBusy(true);
    try {
      const resolved = await codesApi.resolveCode(code);
      const scannedItem = resolved.item;
      if (!scannedItem) {
        setUnboundCode(code);
        setMessage('这是未绑定标签，请选择要绑定的位置、收纳或物品。');
        return;
      }

      if (destination) {
        if (scannedItem.type !== 'item') {
          setMessage('请继续扫描物品标签');
          return;
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

      if (resolved.entityKind === 'location' || resolved.entityKind === 'container') {
        setDestination(scannedItem);
        setMessage(`目标位置：${scannedItem.name}。请连续扫描要归位的物品。`);
        return;
      }
      router.replace(`/item/${scannedItem.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '扫码失败，请重试');
    } finally {
      setTimeout(() => setBusy(false), 900);
    }
  }, [busy, destination, movedIds]);

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

  if (!permission) return <View style={styles.center}><Text>正在检查相机权限…</Text></View>;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>需要相机权限</Text>
        <Text style={styles.description}>相机只用于识别“归位”二维码。</Text>
        <Pressable onPress={() => void requestPermission()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>允许使用相机</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '扫标签归位', headerShown: true }} />
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : (result: BarcodeScanningResult) => void handleBarcode(result)}
      />
      <View style={styles.panel}>
        <Text style={styles.title}>{destination ? `归位到 ${destination.name}` : '扫描 InPlace 标签'}</Text>
        <Text style={styles.description}>{message}</Text>
        {destination ? <Text style={styles.count}>本次已归位 {movedIds.size} 件</Text> : null}
        <Pressable onPress={() => { setDestination(null); setMovedIds(new Set()); setMessage('已重置扫描目标'); }} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>重置目标</Text>
        </Pressable>
      </View>
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

async function fetchBindableItems() {
  const collectedItems: Item[] = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage && page <= 20) {
    const result = await itemsApi.searchItemsPage('', '', { page, pageSize: 100 });
    collectedItems.push(...result.data);
    hasNextPage = result.meta.hasNextPage;
    page += 1;
  }
  return collectedItems;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020617' },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: palette.canvas },
  panel: { padding: 20, paddingBottom: 34, backgroundColor: palette.surface },
  title: { color: palette.text, fontSize: 20, fontWeight: '800' },
  description: { marginTop: 6, color: palette.textSoft, fontSize: 14, lineHeight: 21 },
  count: { marginTop: 10, color: palette.brandStrong, fontSize: 14, fontWeight: '700' },
  primaryButton: { marginTop: 8, borderRadius: 16, backgroundColor: palette.brandStrong, paddingHorizontal: 18, paddingVertical: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { marginTop: 14, alignSelf: 'flex-start', borderRadius: 14, backgroundColor: palette.surfaceMuted, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryButtonText: { color: palette.text, fontWeight: '700' },
});
