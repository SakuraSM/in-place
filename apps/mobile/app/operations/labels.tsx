import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Print from 'expo-print';
import QRCode from 'qrcode';
import type { InventoryCode } from '@inplace/domain';
import { codesApi, getMobileApiBaseUrl } from '@/shared/api/mobileClient';
import { ContentTabs } from '@/shared/ui/ContentTabs';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';

type LabelLayout = 'a4' | 'thermal';

interface PrintableCode {
  record: InventoryCode;
  svg: string;
}

const LAYOUT_TABS = [
  { value: 'a4' as const, label: 'A4 标签纸' },
  { value: 'thermal' as const, label: '50×30mm' },
];

export default function LabelsScreen() {
  const notify = useNotify();
  const [countText, setCountText] = useState('30');
  const [layout, setLayout] = useState<LabelLayout>('a4');
  const [codes, setCodes] = useState<PrintableCode[]>([]);
  const [loading, setLoading] = useState(false);
  const count = Number(countText);
  const isCountValid = Number.isInteger(count) && count >= 1 && count <= 100;

  const handleCreate = async () => {
    if (!isCountValid) {
      notify({ tone: 'error', title: '标签数量需为 1–100' });
      return;
    }
    setLoading(true);
    try {
      const records = await codesApi.createBatch(count);
      const printableCodes = await Promise.all(records.map(async (record) => ({
        record,
        svg: await QRCode.toString(buildInventoryCodeUrl(record.code), {
          type: 'svg',
          width: 240,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#172033', light: '#ffffff' },
        }),
      })));
      setCodes(printableCodes);
      notify({ tone: 'success', title: `已生成 ${printableCodes.length} 枚标签` });
    } catch (error) {
      notify({ tone: 'error', title: '标签生成失败', description: error instanceof Error ? error.message : '请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (codes.length === 0) return;
    try {
      await Print.printAsync({ html: buildLabelsHtml(codes, layout) });
    } catch (error) {
      notify({ tone: 'error', title: '无法打开系统打印预览', description: error instanceof Error ? error.message : '请稍后重试' });
    }
  };

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Stack.Screen options={{ title: '标签打印', headerShown: true }} />
      <SectionCard title="二维码标签" subtitle="标签不包含账号、物品名称或数据库 ID" density="compact">
        <Text style={labelStyle}>标签数量（1–100）</Text>
        <TextInput
          accessibilityLabel="标签数量"
          value={countText}
          onChangeText={setCountText}
          keyboardType="number-pad"
          style={[inputStyle, !isCountValid ? invalidInputStyle : null]}
        />
        <ContentTabs accessibilityLabel="纸张模板" tabs={LAYOUT_TABS} value={layout} onChange={setLayout} />
        <View style={actionRowStyle}>
          <Pressable
            disabled={loading || !isCountValid}
            onPress={() => void handleCreate()}
            style={[primaryButtonStyle, loading || !isCountValid ? disabledStyle : null]}
          >
            <Ionicons name="qr-code-outline" size={18} color="#ffffff" />
            <Text style={primaryButtonTextStyle}>{loading ? '生成中…' : '生成标签'}</Text>
          </Pressable>
          <Pressable
            disabled={codes.length === 0}
            onPress={() => void handlePrint()}
            style={[secondaryButtonStyle, codes.length === 0 ? disabledStyle : null]}
          >
            <Ionicons name="print-outline" size={18} color={palette.text} />
            <Text style={secondaryButtonTextStyle}>系统打印</Text>
          </Pressable>
        </View>
      </SectionCard>
      <SectionCard title={`打印预览 · ${codes.length} 枚`} density="dense" headerMode="compact">
        {codes.length === 0 ? <Text style={emptyTextStyle}>生成后可进入 Android / iOS 系统打印预览。</Text> : null}
        <View style={previewGridStyle}>
          {codes.slice(0, 12).map(({ record }, index) => (
            <View key={record.id} style={previewLabelStyle}>
              <Ionicons name="qr-code" size={30} color={palette.text} />
              <View style={{ flex: 1 }}>
                <Text style={previewBrandStyle}>归位 #{String(index + 1).padStart(2, '0')}</Text>
                <Text numberOfLines={1} style={previewCodeStyle}>{record.code.slice(0, 10)}</Text>
              </View>
            </View>
          ))}
        </View>
        {codes.length > 12 ? <Text style={emptyTextStyle}>其余 {codes.length - 12} 枚将在打印预览中展示。</Text> : null}
      </SectionCard>
    </Screen>
  );
}

function buildInventoryCodeUrl(code: string) {
  const apiBaseUrl = getMobileApiBaseUrl().replace(/\/api\/?$/, '');
  return `${apiBaseUrl}/s/${encodeURIComponent(code)}`;
}

function buildLabelsHtml(codes: PrintableCode[], layout: LabelLayout) {
  const isThermal = layout === 'thermal';
  const labels = codes.map(({ record, svg }, index) => `
    <article class="label">
      ${svg}
      <div><strong>归位</strong><p>扫码绑定 · 找到 · 归位</p><small>#${String(index + 1).padStart(2, '0')} · ${record.code.slice(0, 7)}</small></div>
    </article>
  `).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:${isThermal ? '50mm 30mm' : 'A4'};margin:${isThermal ? '0' : '8mm'}}
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans SC",sans-serif;color:#172033}
    main{display:grid;grid-template-columns:${isThermal ? '1fr' : 'repeat(3,1fr)'};gap:${isThermal ? '0' : '4mm'}}
    .label{box-sizing:border-box;height:${isThermal ? '30mm' : '34mm'};width:${isThermal ? '50mm' : '100%'};border:1px solid #dde9e2;border-radius:3mm;padding:3mm;display:flex;align-items:center;gap:3mm;page-break-inside:avoid}
    svg{width:${isThermal ? '21mm' : '25mm'};height:${isThermal ? '21mm' : '25mm'}}strong{color:#0f766e;font-size:12pt}p{font-size:7pt;margin:1mm 0}small{font-size:6pt;color:#5f6f66}
  </style></head><body><main>${labels}</main></body></html>`;
}

const labelStyle = { fontSize: 13, fontWeight: '800' as const, color: palette.textMuted };
const inputStyle = {
  minHeight: 46,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 13,
  fontSize: 16,
  color: palette.text,
};
const invalidInputStyle = { borderColor: palette.danger };
const actionRowStyle = { flexDirection: 'row' as const, gap: 10 };
const primaryButtonStyle = {
  flex: 1,
  minHeight: 46,
  borderRadius: 15,
  backgroundColor: palette.brandStrong,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 7,
};
const secondaryButtonStyle = {
  flex: 1,
  minHeight: 46,
  borderRadius: 15,
  backgroundColor: palette.canvasStrong,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 7,
};
const primaryButtonTextStyle = { fontSize: 13, fontWeight: '900' as const, color: '#ffffff' };
const secondaryButtonTextStyle = { fontSize: 13, fontWeight: '900' as const, color: palette.text };
const disabledStyle = { opacity: 0.45 };
const emptyTextStyle = { fontSize: 14, lineHeight: 20, color: palette.textSoft };
const previewGridStyle = { gap: 8 };
const previewLabelStyle = {
  minHeight: 58,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surfaceMuted,
  padding: 10,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
};
const previewBrandStyle = { fontSize: 14, fontWeight: '900' as const, color: palette.brandStrong };
const previewCodeStyle = { fontSize: 11, color: palette.textSoft };
