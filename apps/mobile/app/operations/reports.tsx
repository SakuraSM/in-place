import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, Text } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildInventoryReport } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { stocktakesApi } from '@/shared/api/mobileClient';
import { fetchAllMobileItems } from '@/shared/api/fetchAllMobileItems';
import { MetricGrid } from '@/shared/ui/MetricGrid';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';

export default function ReportsScreen() {
  const { user } = useAuth();
  const notify = useNotify();
  const reportQuery = useQuery({
    queryKey: ['mobile', 'inventory-report', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [items, stocktakes] = await Promise.all([
        fetchAllMobileItems(user!.id),
        stocktakesApi.listRecent(),
      ]);
      return { items, stocktakes };
    },
  });
  const report = useMemo(
    () => reportQuery.data ? buildInventoryReport(reportQuery.data.items, reportQuery.data.stocktakes) : null,
    [reportQuery.data],
  );

  const handleExportPdf = async () => {
    if (!report || !reportQuery.data) return;
    try {
      notify({ tone: 'loading', title: '正在生成 PDF' });
      const file = await Print.printToFileAsync({
        html: buildReportHtml(reportQuery.data.items, report),
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: '分享库存报告' });
      } else {
        await Print.printAsync({ uri: file.uri });
      }
      notify({ tone: 'success', title: '库存报告已生成' });
    } catch (error) {
      notify({ tone: 'error', title: '报告生成失败', description: error instanceof Error ? error.message : '请稍后重试' });
    }
  };

  if (reportQuery.isLoading) return <Screen><StateBlock title="生成库存报告" loading /></Screen>;
  if (reportQuery.isError || !report) {
    return <Screen><StateBlock title="报告加载失败" body={reportQuery.error instanceof Error ? reportQuery.error.message : '请稍后重试'} /></Screen>;
  }

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Stack.Screen options={{ title: '库存报告', headerShown: true }} />
      <SectionCard title="家庭库存报告" subtitle="用于搬家、保险留档和日常补货" density="compact">
        <Pressable onPress={() => void handleExportPdf()} style={primaryButtonStyle}>
          <Ionicons name="document-outline" size={18} color="#ffffff" />
          <Text style={primaryButtonTextStyle}>生成并分享 PDF</Text>
        </Pressable>
      </SectionCard>
      <MetricGrid
        columns={2}
        items={[
          { key: 'items', label: '物品记录', value: report.totalItems, iconName: 'cube-outline' },
          { key: 'value', label: '估算总价值', value: `¥${report.totalValue.toFixed(2)}`, iconName: 'wallet-outline' },
          { key: 'low', label: '待补货', value: report.lowStockItems.length, iconName: 'cart-outline' },
          { key: 'missing', label: '盘点缺失', value: report.latestStocktakeMissingCount, iconName: 'alert-circle-outline' },
        ]}
      />
      <ReportList title="补货清单" empty="当前无需补货" rows={report.lowStockItems.map((item) => `${item.name} · ${item.quantity} / 最低 ${item.minimum_quantity}`)} />
      <ReportList title="30 天内到期" empty="近期没有到期物品" rows={report.expiringItems.map((item) => `${item.name} · ${item.expiry_date}`)} />
      <ReportList title="分类价值" empty="暂无价值数据" rows={report.valueByCategory.map((entry) => `${entry.category} · ¥${entry.value.toFixed(2)}`)} />
    </Screen>
  );
}

function ReportList({ title, empty, rows }: { title: string; empty: string; rows: string[] }) {
  return (
    <SectionCard title={title} density="dense" headerMode="compact">
      {rows.length === 0 ? <Text style={emptyTextStyle}>{empty}</Text> : null}
      {rows.map((row) => <Text key={row} style={rowTextStyle}>• {row}</Text>)}
    </SectionCard>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character);
}

function buildReportHtml(items: Awaited<ReturnType<typeof fetchAllMobileItems>>, report: ReturnType<typeof buildInventoryReport>) {
  const itemRows = items.filter((item) => item.type === 'item').map((item) => `
    <tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.category || '未分类')}</td><td>${item.quantity}</td><td>¥${((item.price ?? 0) * item.quantity).toFixed(2)}</td></tr>
  `).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Noto Sans SC",sans-serif;color:#172033;padding:24px}
    h1{color:#0f766e} .metrics{display:flex;gap:12px;margin:18px 0}.metric{border:1px solid #dde9e2;border-radius:12px;padding:12px}
    table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #edf4ef;padding:8px;font-size:12px}
  </style></head><body><h1>归位 · 家庭库存报告</h1><p>生成于 ${new Date().toLocaleString('zh-CN')}</p>
  <div class="metrics"><div class="metric">物品 ${report.totalItems}</div><div class="metric">总价值 ¥${report.totalValue.toFixed(2)}</div><div class="metric">待补货 ${report.lowStockItems.length}</div><div class="metric">盘点缺失 ${report.latestStocktakeMissingCount}</div></div>
  <h2>物品清单</h2><table><thead><tr><th>名称</th><th>类别</th><th>数量</th><th>价值</th></tr></thead><tbody>${itemRows}</tbody></table></body></html>`;
}

const primaryButtonStyle = {
  minHeight: 48,
  borderRadius: 16,
  backgroundColor: palette.brandStrong,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
};
const primaryButtonTextStyle = { fontSize: 14, fontWeight: '900' as const, color: '#ffffff' };
const rowTextStyle = { fontSize: 14, lineHeight: 21, color: palette.textMuted };
const emptyTextStyle = { fontSize: 14, color: palette.textSoft };
