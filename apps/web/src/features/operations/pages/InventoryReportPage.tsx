import { useEffect, useMemo, useState } from 'react';
import { FileDown, Printer } from 'lucide-react';
import type { Item, StocktakeEntry } from '@inplace/domain';
import { useAuth } from '../../../app/providers/auth-context';
import { searchItems } from '../../../legacy/items';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import { stocktakesApi } from '../api';

export default function InventoryReportPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [missingEntries, setMissingEntries] = useState<StocktakeEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    void Promise.all([searchItems('', user.id), stocktakesApi.listRecent()]).then(async ([nextItems, sessions]) => {
      setItems(nextItems);
      const completed = sessions.filter((session) => session.status === 'completed').slice(0, 5);
      const details = await Promise.all(completed.map((session) => stocktakesApi.fetch(session.id)));
      setMissingEntries(details.flatMap((session) => session.entries.filter((entry) => entry.status === 'missing')));
    });
  }, [user]);

  const report = useMemo(() => {
    const inventoryItems = items.filter((item) => item.type === 'item');
    const totalValue = inventoryItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
    const categoryValues = new Map<string, number>();
    inventoryItems.forEach((item) => categoryValues.set(item.category || '未分类', (categoryValues.get(item.category || '未分类') ?? 0) + (item.price ?? 0) * item.quantity));
    return {
      inventoryItems,
      totalValue,
      warrantyCovered: inventoryItems.filter((item) => item.warranty_date && new Date(item.warranty_date) >= new Date()).length,
      lowStock: inventoryItems.filter((item) => item.minimum_quantity !== null && item.quantity <= item.minimum_quantity),
      expiring: inventoryItems.filter((item) => item.expiry_date && new Date(item.expiry_date).getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000),
      categories: [...categoryValues.entries()].sort((left, right) => right[1] - left[1]),
    };
  }, [items]);

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
          {[['物品总数', report.inventoryItems.length], ['估算总价值', `¥${report.totalValue.toFixed(2)}`], ['待补货', report.lowStock.length], ['最近盘点缺失', missingEntries.length]].map(([label, value]) => <div key={label} className="rounded-2xl border border-borderSoft bg-surface p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>)}
        </section>
        {(report.lowStock.length > 0 || report.expiring.length > 0) ? (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-amber-950">补货清单</h2><ul className="mt-3 space-y-2 text-sm text-amber-900">{report.lowStock.map((item) => <li key={item.id}>{item.name} · 当前 {item.quantity} / 最低 {item.minimum_quantity}</li>)}</ul></div>
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5"><h2 className="font-bold text-rose-950">30 天内到期</h2><ul className="mt-3 space-y-2 text-sm text-rose-900">{report.expiring.map((item) => <li key={item.id}>{item.name} · {item.expiry_date}</li>)}</ul></div>
          </section>
        ) : null}
        <section className="rounded-3xl border border-borderSoft bg-surface p-5">
          <h2 className="font-bold text-slate-900">分类价值</h2>
          <div className="mt-3 divide-y divide-borderSoft">{report.categories.map(([category, value]) => <div key={category} className="flex justify-between gap-3 py-2 text-sm"><span>{category}</span><span className="font-semibold">¥{value.toFixed(2)}</span></div>)}</div>
        </section>
        <section className="rounded-3xl border border-borderSoft bg-surface p-5">
          <h2 className="font-bold text-slate-900">物品清单</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b border-border"><th className="py-2">名称</th><th>类别</th><th>数量</th><th>状态</th><th>价值</th><th>保修截止</th></tr></thead><tbody>{report.inventoryItems.map((item) => <tr key={item.id} className="border-b border-borderSoft"><td className="py-2 font-semibold">{item.name}</td><td>{item.category || '未分类'}</td><td>{item.quantity}</td><td>{item.status}</td><td>{item.price ? `¥${(item.price * item.quantity).toFixed(2)}` : '—'}</td><td>{item.warranty_date ? new Date(item.warranty_date).toLocaleDateString('zh-CN') : '—'}</td></tr>)}</tbody></table>
          </div>
        </section>
        <p className="flex items-center gap-2 text-xs text-slate-500 print:hidden"><FileDown size={14} />CSV 原始清单仍可从“我的 → 数据管理”导出。</p>
      </PageContent>
    </PageShell>
  );
}
