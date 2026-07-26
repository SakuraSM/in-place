import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ClipboardCheck, Minus, Plus } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { StocktakeSession } from '@inplace/domain';
import { useToast } from '../../../shared/ui/toast';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import CodeScanner from '../components/CodeScanner';
import { codesApi, stocktakesApi } from '../api';

const STATUS_LABELS = {
  expected: '待核对',
  found: '已找到',
  missing: '缺失',
  unexpected: '清单外',
} as const;

export default function StocktakeDetailPage() {
  const { id = '' } = useParams();
  const { notify } = useToast();
  const [session, setSession] = useState<StocktakeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [reconcileMoves, setReconcileMoves] = useState(false);
  const [reconcileQuantities, setReconcileQuantities] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setSession(await stocktakesApi.fetch(id));
    } catch (error) {
      notify({ tone: 'error', title: '盘点加载失败', description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [id, notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const countItem = useCallback(async (itemId: string, quantity: number) => {
    try {
      await stocktakesApi.countItem({
        stocktakeId: id,
        itemId,
        countedQuantity: Math.max(0, quantity),
        foundParentId: session?.location_id,
      });
      await refresh();
    } catch (error) {
      notify({ tone: 'error', title: '核对失败，盘点清单已保留', description: error instanceof Error ? error.message : undefined });
    }
  }, [id, notify, refresh, session?.location_id]);

  const scanItem = useCallback(async (code: string) => {
    try {
      const resolved = await codesApi.resolveCode(code);
      if (!resolved.item || resolved.item.type !== 'item') {
        notify({ tone: 'error', title: '请扫描物品标签' });
        return;
      }
      await countItem(resolved.item.id, resolved.item.quantity);
      notify({ tone: 'success', title: `${resolved.item.name} 已找到` });
    } catch (error) {
      notify({ tone: 'error', title: '扫码核对失败', description: error instanceof Error ? error.message : undefined });
    }
  }, [countItem, notify]);

  const summary = useMemo(() => {
    const entries = session?.entries ?? [];
    return {
      total: entries.length,
      found: entries.filter((entry) => entry.status === 'found').length,
      unexpected: entries.filter((entry) => entry.status === 'unexpected').length,
      pending: entries.filter((entry) => entry.status === 'expected').length,
      missing: entries.filter((entry) => entry.status === 'missing').length,
      quantityDiff: entries.filter((entry) => entry.counted_quantity !== null && entry.counted_quantity !== entry.expected_quantity).length,
    };
  }, [session?.entries]);

  const complete = async () => {
    setCompleting(true);
    try {
      setSession(await stocktakesApi.complete({ stocktakeId: id, reconcileMoves, reconcileQuantities }));
      notify({ tone: 'success', title: '盘点已完成', description: '差异和操作记录已保存。' });
    } catch (error) {
      notify({ tone: 'error', title: '完成盘点失败', description: error instanceof Error ? error.message : undefined });
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <PageContent width="narrow" className="flex items-center justify-center text-sm text-slate-500">
          正在恢复盘点…
        </PageContent>
      </PageShell>
    );
  }
  if (!session) {
    return (
      <PageShell>
        <PageContent width="narrow" className="flex items-center justify-center">
          盘点不存在
        </PageContent>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        width="narrow"
        eyebrow="盘点位置"
        title={session.location.name}
        titleSize="detail"
        actions={(
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${session.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
            {session.status === 'completed' ? '已完成' : '进行中，可随时离开后继续'}
          </span>
        )}
      />
      <PageContent width="narrow" className="space-y-5">
        <section className="rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">盘点概览</h2>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ['期望', summary.total],
              ['已找到', summary.found],
              ['待核对', summary.pending],
              ['清单外', summary.unexpected],
              ['数量差异', summary.quantityDiff],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-surfaceMuted p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {session.status === 'in_progress' ? (
          <section className="rounded-3xl border border-brand/25 bg-surface p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">扫码核对</h2>
            <p className="mb-4 mt-1 text-sm text-slate-500">连续扫描物品标签；清单外物品也会单独标记。</p>
            <CodeScanner onCode={(code) => void scanItem(code)} continuous />
          </section>
        ) : null}

        <section className="rounded-3xl border border-borderSoft bg-surface p-4 shadow-sm md:p-5">
          <h2 className="mb-3 font-bold text-slate-900">盘点清单</h2>
          <div className="space-y-2">
            {session.entries.map((entry) => {
              const counted = entry.counted_quantity ?? 0;
              return (
                <article key={entry.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surfaceMuted p-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${entry.status === 'found' ? 'bg-emerald-100 text-emerald-700' : entry.status === 'unexpected' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-800'}`}>
                    {entry.status === 'found' ? <Check size={17} /> : <AlertTriangle size={17} />}
                  </span>
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-semibold text-slate-900">{entry.item.name}</p>
                    <p className="text-xs text-slate-500">{STATUS_LABELS[entry.status]} · 期望 {entry.expected_quantity} · 实盘 {entry.counted_quantity ?? '—'}</p>
                  </div>
                  {session.status === 'in_progress' ? (
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label={`减少 ${entry.item.name} 实盘数量`} onClick={() => void countItem(entry.item_id, counted - 1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface"><Minus size={15} /></button>
                      <span className="w-8 text-center text-sm font-bold">{counted}</span>
                      <button type="button" aria-label={`增加 ${entry.item.name} 实盘数量`} onClick={() => void countItem(entry.item_id, counted + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface"><Plus size={15} /></button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        {session.status === 'in_progress' ? (
          <section className="rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">完成前确认差异</h2>
            <p className="mt-1 text-sm text-slate-500">仍待核对的 {summary.pending} 项会标为缺失，但不会删除。</p>
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={reconcileMoves} onChange={(event) => setReconcileMoves(event.target.checked)} className="mt-0.5 h-4 w-4" />将位置不符的已找到物品移动到本次盘点位置</label>
              <label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={reconcileQuantities} onChange={(event) => setReconcileQuantities(event.target.checked)} className="mt-0.5 h-4 w-4" />将实盘数量写回库存（缺失项保持原数量）</label>
            </div>
            <button type="button" disabled={completing} onClick={() => void complete()} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brandStrong px-5 text-sm font-bold text-white disabled:opacity-50">
              <ClipboardCheck size={18} />
              {completing ? '保存结果中…' : '确认并完成盘点'}
            </button>
          </section>
        ) : null}
      </PageContent>
    </PageShell>
  );
}
