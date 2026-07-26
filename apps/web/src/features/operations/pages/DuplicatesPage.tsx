import { useCallback, useEffect, useMemo, useState } from 'react';
import { Combine, CopyCheck } from 'lucide-react';
import type { Item } from '@inplace/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../app/providers/auth-context';
import { searchItems } from '../../../legacy/items';
import { apiRequest } from '../../../shared/api/client';
import { useToast } from '../../../shared/ui/toast';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';

function duplicateIdentity(item: Item) {
  return `${item.type}:${item.name.trim().toLocaleLowerCase('zh-CN')}:${item.category.trim().toLocaleLowerCase('zh-CN')}`;
}

export default function DuplicatesPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Item[]>([]);
  const [mergingKey, setMergingKey] = useState('');

  const refresh = useCallback(async () => {
    if (user) setItems(await searchItems('', user.id));
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const groups = useMemo(() => {
    const byIdentity = new Map<string, Item[]>();
    items.filter((item) => item.type === 'item').forEach((item) => {
      const key = duplicateIdentity(item);
      byIdentity.set(key, [...(byIdentity.get(key) ?? []), item]);
    });
    return [...byIdentity.entries()].filter(([, entries]) => entries.length > 1);
  }, [items]);

  const merge = async (key: string, entries: Item[]) => {
    const [primary, ...duplicates] = entries;
    setMergingKey(key);
    try {
      await apiRequest('/v1/items/merge', {
        method: 'POST',
        body: JSON.stringify({
          primaryItemId: primary.id,
          duplicateItemIds: duplicates.map((item) => item.id),
        }),
      });
      await queryClient.invalidateQueries();
      await refresh();
      notify({ tone: 'success', title: `已合并 ${entries.length} 条「${primary.name}」记录` });
    } catch (error) {
      notify({ tone: 'error', title: '合并失败，原记录均已保留', description: error instanceof Error ? error.message : undefined });
    } finally {
      setMergingKey('');
    }
  };

  return (
    <PageShell>
      <PageHeader width="narrow" eyebrow="数据清理" title="重复物品检测" titleSize="detail" />
      <PageContent width="narrow">
        {groups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surfaceMuted p-10 text-center"><CopyCheck size={34} className="mx-auto text-brand" /><p className="mt-3 font-bold text-slate-800">没有发现同名同类别的重复记录</p></div>
        ) : (
          <div className="space-y-4">
            {groups.map(([key, entries]) => (
              <section key={key} className="rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="font-bold text-slate-900">{entries[0].name}</h2><p className="mt-1 text-sm text-slate-500">{entries[0].category || '未分类'} · {entries.length} 条记录 · 合计数量 {entries.reduce((sum, item) => sum + item.quantity, 0)}</p></div>
                  <button type="button" disabled={mergingKey === key} onClick={() => void merge(key, entries)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brandStrong px-4 text-sm font-bold text-white disabled:opacity-50"><Combine size={16} />{mergingKey === key ? '合并中…' : '合并记录'}</button>
                </div>
                <ul className="mt-4 divide-y divide-borderSoft">{entries.map((item, index) => <li key={item.id} className="flex justify-between gap-3 py-2 text-sm"><span>{index === 0 ? '保留为主记录' : '合并后移除'} · {new Date(item.created_at).toLocaleDateString('zh-CN')}</span><span>数量 {item.quantity}</span></li>)}</ul>
              </section>
            ))}
          </div>
        )}
      </PageContent>
    </PageShell>
  );
}
