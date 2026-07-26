import { useCallback, useState } from 'react';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { codesApi, itemsApi } from '@/shared/api/mobileClient';
import { palette } from '@/shared/ui/theme';

function parseCode(value: string) {
  const match = value.trim().match(/(?:^|\/)s\/([A-Za-z0-9_-]{20,64})(?:[/?#]|$)/);
  const code = match?.[1] ?? value.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(code);
  return /^[A-Za-z0-9_-]{20,64}$/.test(code) && !isUuid ? code : null;
}

export default function CodeScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('扫描物品进入详情；扫描位置后继续扫描物品即可归位。');
  const [destination, setDestination] = useState<Item | null>(null);
  const [movedIds, setMovedIds] = useState<Set<string>>(() => new Set());

  const handleBarcode = useCallback(async (result: BarcodeScanningResult) => {
    if (busy) return;
    const code = parseCode(result.data);
    if (!code) {
      setMessage('这不是有效的“归位”标签');
      return;
    }
    setBusy(true);
    try {
      const resolved = await codesApi.resolveCode(code);
      const scannedItem = resolved.item;
      if (!scannedItem) {
        setMessage('这是未绑定标签，请先在 Web 端选择对象完成绑定。');
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
      <Stack.Screen options={{ title: '扫码归位', headerShown: true }} />
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : (result: BarcodeScanningResult) => void handleBarcode(result)}
      />
      <View style={styles.panel}>
        <Text style={styles.title}>{destination ? `归位到 ${destination.name}` : '扫描“归位”标签'}</Text>
        <Text style={styles.description}>{message}</Text>
        {destination ? <Text style={styles.count}>本次已归位 {movedIds.size} 件</Text> : null}
        <Pressable onPress={() => { setDestination(null); setMovedIds(new Set()); setMessage('已重置扫描目标'); }} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>重置目标</Text>
        </Pressable>
      </View>
    </View>
  );
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
