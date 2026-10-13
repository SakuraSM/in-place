import { useMemo, useState } from 'react';
import { Combine, CopyCheck } from 'lucide-react';
import { groupDuplicateInventory, type DuplicateInventoryGroup } from '@inplace/app-core';
import { useQueryClient } from '@tanstack/react-query';
import { useHousehold } from '../../../app/providers/household-context';
import { useAllInventoryItems } from '../../inventory/hooks/useAllInventoryItems';
import { apiRequest } from '../../../shared/api/client';
import { useToast } from '../../../shared/ui/toast';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';

export default function DuplicatesPage() {
  const { currentHousehold } = useHousehold();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const inventory = useAllInventoryItems();
  const [targetGroup, setTargetGroup] = useState<DuplicateInventoryGroup | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const canEdit = currentHousehold?.role === 'owner' || currentHousehold?.role === 'editor';
  const groups = useMemo(() => groupDuplicateInventory((inventory.data ?? []).filter((item) => item.type === 'item')), [inventory.data]);
  const names = useMemo(() => new Map((inventory.data ?? []).map((item) => [item.id, item.name])), [inventory.data]);

  const merge = async (): Promise<void> => {
    if (!targetGroup || isMerging || !canEdit) return;
    const [primary, ...duplicates] = targetGroup.items;
    setIsMerging(true);
    try {
      await apiRequest('/v1/items/merge', { method: 'POST', body: JSON.stringify({ primaryItemId: primary.id, duplicateItemIds: duplicates.map((item) => item.id) }) });
      setTargetGroup(null);
      await queryClient.invalidateQueries();
      notify({ tone: 'success', title: `已合并 ${targetGroup.items.length} 条「${primary.name}」记录` });
    } catch (error) {
      notify({ tone: 'error', title: '合并失败，原记录均已保留', description: error instanceof Error ? error.message : undefined });
    } finally { setIsMerging(false); }
  };

  return (
    <PageShell>
      <PageHeader width="narrow" eyebrow="数据清理" title="重复物品检测" titleSize="detail" />
      <PageContent width="narrow">
        <p className="mb-4 text-sm leading-6 text-slate-600">按名称、类型和类别识别。保留最早记录的位置、状态及日期，累加数量、图片和标签。有关联盘点或借用记录的待移除物品不能合并。</p>
        {inventory.isLoading ? <p role="status">正在检测重复项…</p> : inventory.isError ? <p role="alert">重复项加载失败。<button type="button" onClick={() => void inventory.refetch()} className="ml-3 text-brandStrong">重试</button></p> : groups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surfaceMuted p-10 text-center"><CopyCheck size={34} className="mx-auto text-brandStrong" /><p className="mt-3 font-bold text-slate-800">没有发现同名同类别的重复记录</p></div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.key} className="rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="font-bold text-slate-900">{group.items[0].name}</h2><p className="mt-1 text-sm text-slate-500">{group.category || '未分类'} · {group.items.length} 条记录 · 合计数量 {group.items.reduce((sum, item) => sum + item.quantity, 0)}</p></div>
                  {canEdit ? <button type="button" disabled={isMerging} onClick={() => setTargetGroup(group)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brandStrong px-4 text-sm font-bold text-white disabled:opacity-50"><Combine size={16} />合并记录</button> : null}
                </div>
                <ul className="mt-4 divide-y divide-borderSoft">{group.items.map((item, index) => <li key={item.id} className="space-y-1 py-3 text-sm"><p>{index === 0 ? '保留为主记录' : '合并后移除'} · {new Date(item.created_at).toLocaleDateString('zh-CN')} · 数量 {item.quantity}</p><p className="break-words text-slate-500">位置：{names.get(item.parent_id ?? '') ?? '根目录'} · 单价：{item.price ?? '未填写'} · 到期：{item.expiry_date ?? '未填写'} · 状态：{{ in_stock: '在库', borrowed: '借出', worn_out: '损耗' }[item.status]}</p></li>)}</ul>
              </section>
            ))}
          </div>
        )}
      </PageContent>
      {targetGroup ? <ConfirmDialog title="合并重复记录" message={`将保留「${targetGroup.items[0].name}」最早记录，并移除其余 ${targetGroup.items.length - 1} 条。数量、图片和标签会合并，此操作不可撤销。`} danger confirmLabel="确认合并" isConfirming={isMerging} onConfirm={() => void merge()} onCancel={() => { if (!isMerging) setTargetGroup(null); }} /> : null}
    </PageShell>
  );
}
