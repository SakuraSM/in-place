import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Link2, MapPin, Package, QrCode } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { Item } from '@inplace/domain';
import { searchItems, updateItem } from '../../../legacy/items';
import { useAuth } from '../../../app/providers/auth-context';
import { useToast } from '../../../shared/ui/toast';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import EntityBadge from '../../inventory/components/EntityBadge';
import { resolveItemDetailPath } from '../../inventory/lib/detailPath';
import CodeScanner from '../components/CodeScanner';
import { codesApi } from '../api';
import { rememberInventoryScan } from '../lib/inventoryCode';

type ResolvedCode = Awaited<ReturnType<typeof codesApi.resolveCode>>;

function ItemChoice({
  items,
  value,
  onChange,
}: {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">绑定对象</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-border bg-surfaceMuted px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        <option value="">选择位置、收纳或物品</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.type === 'item' ? '物品' : item.metadata.location_tag === true ? '位置' : '收纳'} · {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CodeResolvePage() {
  const { code = '' } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const [resolved, setResolved] = useState<ResolvedCode | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [movedItems, setMovedItems] = useState<Item[]>([]);

  const loadCode = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await codesApi.resolveCode(code);
      setResolved(next);
      if (next.item && next.entityKind) {
        rememberInventoryScan({ code, name: next.item.name, entityKind: next.entityKind });
      }
      if (!next.item && user) {
        setItems(await searchItems('', user.id));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '二维码读取失败');
    } finally {
      setLoading(false);
    }
  }, [code, user]);

  useEffect(() => {
    void loadCode();
  }, [loadCode]);

  const bindSelected = async () => {
    if (!selectedItemId) return;
    setSaving(true);
    try {
      await codesApi.bindCode(code, selectedItemId);
      await loadCode();
      notify({ tone: 'success', title: '标签绑定成功' });
    } catch (bindError) {
      notify({
        tone: 'error',
        title: '标签绑定失败',
        description: bindError instanceof Error ? bindError.message : '请稍后重试',
      });
    } finally {
      setSaving(false);
    }
  };

  const destination = resolved?.entityKind === 'location' || resolved?.entityKind === 'container'
    ? resolved.item
    : null;
  const movedIds = useMemo(() => new Set(movedItems.map((item) => item.id)), [movedItems]);

  const moveScannedItem = useCallback(async (scannedCode: string) => {
    if (!destination) return;
    try {
      const scanned = await codesApi.resolveCode(scannedCode);
      if (!scanned.item || scanned.item.type !== 'item') {
        notify({ tone: 'error', title: '请扫描已绑定的物品标签' });
        return;
      }
      if (movedIds.has(scanned.item.id)) {
        notify({ tone: 'info', title: `${scanned.item.name} 已在本次归位清单中` });
        return;
      }
      const moved = await updateItem(scanned.item.id, { parent_id: destination.id });
      setMovedItems((current) => [...current, moved]);
      notify({ tone: 'success', title: `${moved.name} 已归位到 ${destination.name}` });
    } catch (moveError) {
      notify({
        tone: 'error',
        title: '归位失败，当前清单已保留',
        description: moveError instanceof Error ? moveError.message : '请重试本次扫描',
      });
    }
  }, [destination, movedIds, notify]);

  if (loading) {
    return (
      <PageShell>
        <PageContent width="narrow" className="flex items-center justify-center text-sm text-slate-500">
          正在安全读取标签…
        </PageContent>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        width="narrow"
        eyebrow="安全标签"
        title={error ? '无法读取二维码' : resolved?.item ? resolved.item.name : '这是一个未绑定标签'}
        actions={(
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brandTint text-brandStrong">
            {resolved?.item ? <CheckCircle2 size={24} /> : <QrCode size={24} />}
          </span>
        )}
      />
      <PageContent width="narrow" className="space-y-5">
        <section className="rounded-3xl border border-borderSoft bg-surface p-5 shadow-sm md:p-7">
          {error ? (
            <div className="rounded-2xl bg-rose-50 p-4">
              <p role="alert" className="text-sm text-rose-700">{error}</p>
              <button type="button" onClick={() => void loadCode()} className="mt-3 text-sm font-bold text-rose-800">重新读取</button>
            </div>
          ) : null}

          {!error && !resolved?.item ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm leading-6 text-slate-600">选择已有对象完成绑定。标签不会显示对象名称，必须登录当前家庭空间才能读取。</p>
              <ItemChoice items={items} value={selectedItemId} onChange={setSelectedItemId} />
              <button
                type="button"
                disabled={!selectedItemId || saving}
                onClick={() => void bindSelected()}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brandStrong px-5 text-sm font-bold text-white disabled:opacity-50"
              >
                <Link2 size={18} />
                {saving ? '绑定中…' : '绑定这个标签'}
              </button>
              <Link to="/?create=1" className="inline-flex items-center gap-2 text-sm font-bold text-brandStrong">
                先新建对象 <ArrowRight size={16} />
              </Link>
            </div>
          ) : null}

          {resolved?.item ? (
            <div className="mt-6">
              <EntityBadge
                kind={resolved.item.type === 'item'
                  ? 'item'
                  : resolved.item.metadata.location_tag === true
                    ? 'location'
                    : 'container'}
              />
              <p className="mt-3 text-sm text-slate-600">{resolved.item.category || '暂未设置类别'}</p>
              <Link
                to={resolveItemDetailPath(resolved.item)}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-2xl border border-border bg-surfaceMuted px-4 text-sm font-bold text-slate-800"
              >
                {resolved.item.type === 'item' ? <Package size={17} /> : <MapPin size={17} />}
                查看详情
              </Link>
            </div>
          ) : null}
        </section>

        {destination ? (
          <section className="rounded-3xl border border-brand/25 bg-surface p-5 shadow-sm md:p-7">
            <h2 className="text-lg font-bold text-slate-950">连续归位到「{destination.name}」</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">继续扫描物品标签；重复扫描会自动忽略，失败时已归位清单不会丢失。</p>
            <div className="mt-5">
              <CodeScanner onCode={(nextCode) => void moveScannedItem(nextCode)} continuous />
            </div>
            {movedItems.length > 0 ? (
              <div className="mt-5 border-t border-borderSoft pt-4">
                <p className="text-sm font-bold text-slate-800">本次已归位 {movedItems.length} 件</p>
                <ul className="mt-2 space-y-2">
                  {movedItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      {item.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </PageContent>
    </PageShell>
  );
}
