import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildInventoryReport } from '@inplace/app-core';
import { FileDown, Printer } from 'lucide-react';
import { useAuth } from '../../../app/providers/auth-context';
import { useHousehold } from '../../../app/providers/household-context';
import { useAllInventoryItems } from '../../inventory/hooks/useAllInventoryItems';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import { stocktakesApi } from '../api';

const STATUS_LABELS = { in_stock: '在库', borrowed: '借出', worn_out: '损耗' };
export default function InventoryReportPage() {
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  const inventory = useAllInventoryItems();
  const stocktakes = useQuery({
    queryKey: ['reports', 'latest-stocktake', user?.id, currentHousehold?.id],
    enabled: Boolean(user && currentHousehold),
    queryFn: () => stocktakesApi.fetchLatestCompleted(),
  });
  const report = useMemo(() => buildInventoryReport(inventory.data ?? [], stocktakes.data ?? []), [inventory.data, stocktakes.data]);
  const inventoryItems = (inventory.data ?? []).filter((item) => item.type === 'item');
  if (inventory.isLoading || stocktakes.isLoading) return <PageShell><p role="status" className="p-8">正在生成报告…</p></PageShell>;
  if (inventory.isError || stocktakes.isError) return <PageShell><div role="alert" className="p-8">报告加载失败，不能生成完整统计。<button type="button" onClick={() => { void inventory.refetch(); void stocktakes.refetch(); }} className="ml-3 text-brandStrong">重试</button></div></PageShell>;

  return (
    <PageShell>
      <PageHeader
        width="narrow"
        eyebrow="搬家 / 保险留档"
        title="家庭库存报告"
        titleSize="detail"
        className="print:hidden"
        actions={<button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white"><Printer size={17} />打印或保存 PDF</button>}
      />
      <PageContent width="narrow" className="space-y-5 print:max-w-none print:p-0">
        <div className="hidden print:block"><h1 className="text-2xl font-bold">归位 · 家庭库存报告</h1><p className="mt-1 text-sm">生成于 {new Date().toLocaleString('zh-CN')}</p></div>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['物品记录数', inventoryItems.length], ['估算总价值', `¥${report.totalValue.toFixed(2)}`], ['待补货', report.lowStockItems.length], ['最近盘点缺失', report.latestStocktakeMissingCount]].map(([label, value]) => <div key={label} className="rounded-2xl border border-borderSoft bg-surface p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>)}
        </section>
        {(report.lowStockItems.length > 0 || report.expiringItems.length > 0) ? (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-950">补货清单</h2><ul className="mt-3 space-y-2 text-sm text-amber-900">{report.lowStockItems.map((item) => <li key={item.id}>{item.name} · 当前 {item.quantity} / 最低 {item.minimum_quantity}</li>)}</ul></div>
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5"><h2 className="font-bold text-rose-950">30 天内到期</h2><ul className="mt-3 space-y-2 text-sm text-rose-900">{report.expiringItems.map((item) => <li key={item.id}>{item.name} · {item.expiry_date}</li>)}</ul></div>
          </section>
        ) : null}
        {report.expiredItems.length > 0 ? <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5"><h2 className="font-bold text-rose-950">已过期</h2><ul className="mt-3 space-y-2 text-sm text-rose-900">{report.expiredItems.map((item) => <li key={item.id}>{item.name} · {item.expiry_date}</li>)}</ul></section> : null}
        <section className="rounded-3xl border border-borderSoft bg-surface p-5">
          <h2 className="font-bold text-slate-900">分类价值</h2>
          <div className="mt-3 divide-y divide-borderSoft">{report.valueByCategory.map(({category, value}) => <div key={category} className="flex justify-between gap-3 py-2 text-sm"><span>{category}</span><span className="font-semibold">¥{value.toFixed(2)}</span></div>)}</div>
        </section>
        <section className="rounded-3xl border border-borderSoft bg-surface p-5">
          <h2 className="font-bold text-slate-900">物品清单</h2>
          <div tabIndex={0} role="region" aria-label="物品清单，可横向滚动" className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b border-border"><th className="py-2">名称</th><th>类别</th><th>数量</th><th>状态</th><th>价值</th><th>保修截止</th></tr></thead><tbody>{inventoryItems.map((item) => <tr key={item.id} className="border-b border-borderSoft"><td className="py-2 font-semibold">{item.name}</td><td>{item.category || '未分类'}</td><td>{item.quantity}</td><td>{STATUS_LABELS[item.status]}</td><td>{item.price !== null ? `¥${(item.price * item.quantity).toFixed(2)}` : '—'}</td><td>{item.warranty_date ? new Date(item.warranty_date).toLocaleDateString('zh-CN') : '—'}</td></tr>)}</tbody></table>
          </div>
        </section>
        <p className="flex items-center gap-2 text-xs text-slate-500 print:hidden"><FileDown size={14} />CSV 原始清单仍可从“我的 → 数据管理”导出。</p>
      </PageContent>
    </PageShell>
  );
}
