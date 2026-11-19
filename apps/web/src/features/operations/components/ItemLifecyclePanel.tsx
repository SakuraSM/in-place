import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { inventoryDateToIso, parseInventoryQuantity } from '@inplace/app-core';
import { FileText, Handshake, PackagePlus, RotateCcw, Upload, Wrench } from 'lucide-react';
import type { Attachment, InventoryBatch, Item, Loan, MaintenanceRecord } from '@inplace/domain';
import { useToast } from '../../../shared/ui/toast';
import ModernDatePicker from '../../../shared/ui/ModernDatePicker';
import { lifecycleApi } from '../api';
import { fetchItem, updateItem } from '../../../legacy/items';
import { useInventoryPermissions } from '../../../shared/hooks/useInventoryPermissions';

interface MutationOptions {
  successTitle: string;
  onSaved?: () => void;
  refreshItem?: boolean;
}

interface ItemIdentity {
  id: string;
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-borderSoft bg-surface p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">{icon}{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ItemLifecyclePanel({
  item,
  onItemChange,
  onEditBlockedChange,
}: {
  item: Item;
  onItemChange: (item: Item) => void;
  onEditBlockedChange?: (isBlocked: boolean) => void;
}) {
  const { notify } = useToast();
  const { canEditInventory } = useInventoryPermissions();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [borrowerName, setBorrowerName] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [nextDueAt, setNextDueAt] = useState('');
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [batchExpiry, setBatchExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const requestVersionRef = useRef(0);
  const itemIdentityRef = useRef<ItemIdentity>({ id: item.id });
  const [stockQuantity, setStockQuantity] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    // Returning to the same ID must not revive requests from an earlier visit.
    if (itemIdentityRef.current.id !== item.id) itemIdentityRef.current = { id: item.id };
  }, [item.id]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
    };
  }, []);

  useEffect(() => {
    busyRef.current = false;
    setSaving(false);
    return () => { onEditBlockedChange?.(false); };
  }, [item.id, onEditBlockedChange]);

  useEffect(() => {
    onEditBlockedChange?.(saving || loadError);
  }, [saving, loadError, onEditBlockedChange]);

  const refresh = useCallback(async ({ includeItem = false }: { includeItem?: boolean } = {}) => {
    const identity = itemIdentityRef.current;
    if (!mountedRef.current || identity.id !== item.id) return false;
    const requestVersion = ++requestVersionRef.current;
    const isCurrentRequest = () => mountedRef.current
      && itemIdentityRef.current === identity
      && requestVersionRef.current === requestVersion;
    setIsLoading(true);
    try {
      const [nextLoans, nextAttachments, nextMaintenance, nextBatches, nextItem] = await Promise.all([
        lifecycleApi.listLoans(),
        lifecycleApi.listAttachments(item.id),
        lifecycleApi.listMaintenance(item.id),
        lifecycleApi.listBatches(item.id),
        includeItem ? fetchItem(item.id) : Promise.resolve(null),
      ]);
      if (!isCurrentRequest()) return false;
      if (includeItem && !nextItem) throw new Error('物品信息不存在');
      setLoans(nextLoans.filter((loan) => loan.item_id === item.id));
      setAttachments(nextAttachments);
      setMaintenance(nextMaintenance);
      setBatches(nextBatches);
      if (nextItem) onItemChange(nextItem);
      setLoadError(false);
      return true;
    } catch (error) {
      if (!isCurrentRequest()) return false;
      throw error;
    } finally {
      if (isCurrentRequest()) setIsLoading(false);
    }
  }, [item.id, onItemChange]);

  useEffect(() => {
    const identity = itemIdentityRef.current;
    void refresh().catch(() => {
      if (mountedRef.current && itemIdentityRef.current === identity) setLoadError(true);
    });
    return () => { requestVersionRef.current += 1; };
  }, [item.id, refresh]);

  const runMutation = async (action: () => Promise<void>, { successTitle, onSaved, refreshItem = false }: MutationOptions) => {
    const identity = itemIdentityRef.current;
    const isCurrentMutation = () => mountedRef.current && itemIdentityRef.current === identity && identity.id === item.id;
    if (!isCurrentMutation() || !canEditInventory || isLoading || loadError || busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    onEditBlockedChange?.(true);
    try {
      await action();
      if (!isCurrentMutation()) return;
      onSaved?.();
      try {
        if (await refresh({ includeItem: refreshItem })) notify({ tone: 'success', title: successTitle });
      } catch {
        if (!isCurrentMutation()) return;
        setLoadError(true);
        notify({ tone: 'info', title: '记录已保存，数据刷新失败', description: '请点击重试加载，无需重复提交' });
      }
    } catch (error) {
      if (isCurrentMutation()) {
        notify({ tone: 'error', title: '操作失败，表单内容已保留', description: error instanceof Error ? error.message : undefined });
      }
    } finally {
      if (isCurrentMutation()) {
        busyRef.current = false;
        setSaving(false);
      }
    }
  };

  const activeLoan = loans.find((loan) => !loan.returned_at);

  const updateDisplayedItem = (updated: Item, identity: ItemIdentity) => {
    if (mountedRef.current && itemIdentityRef.current === identity && updated.id === identity.id) {
      onItemChange(updated);
    }
  };

  const adjustQuantity = async (delta: number) => {
    const identity = itemIdentityRef.current;
    const nextQuantity = Math.max(0, item.quantity + delta);
    await runMutation(async () => {
      updateDisplayedItem(await updateItem(item.id, { quantity: nextQuantity }), identity);
    }, { successTitle: `库存数量已更新为 ${nextQuantity}` });
  };

  const saveStockQuantity = async () => {
    if (stockQuantity === null) return;
    const identity = itemIdentityRef.current;
    await runMutation(async () => {
      updateDisplayedItem(await updateItem(item.id, { quantity: parseInventoryQuantity(stockQuantity) }), identity);
    }, { successTitle: '库存数量已更新', onSaved: () => setStockQuantity(null) });
  };

  const retryRefresh = () => {
    const identity = itemIdentityRef.current;
    void refresh({ includeItem: true }).catch(() => {
      if (mountedRef.current && itemIdentityRef.current === identity) setLoadError(true);
    });
  };

  return (
    <>
      {isLoading || saving ? <p role="status" className="text-sm text-slate-600">{saving ? '正在保存物品记录…' : '正在加载物品记录…'}</p> : null}
      {loadError ? <p role="alert" className="text-sm text-amber-800">记录或物品信息加载失败。<button type="button" disabled={isLoading} onClick={retryRefresh} className="underline">重试加载</button></p> : null}
    <fieldset disabled={!canEditInventory || isLoading || saving || loadError} className="min-w-0 space-y-4">
      {!canEditInventory ? <p className="text-sm text-slate-500">当前家庭为只读，可查看库存与历史记录。</p> : null}
      {item.tracking_mode !== 'unique' ? (
        <Section title="快速库存" icon={<PackagePlus size={16} />}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold text-slate-900">{item.quantity}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.minimum_quantity === null ? '未设置最低库存' : `最低库存 ${item.minimum_quantity}`}
                {item.expiry_date ? ` · 有效期 ${item.expiry_date}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" aria-label="库存减一" disabled={saving || item.quantity <= 0} onClick={() => void adjustQuantity(-1)} className="h-10 rounded-xl bg-surfaceMuted px-4 text-sm font-semibold text-slate-800 disabled:opacity-40">− 1</button>
              <button type="button" onClick={() => setStockQuantity(String(item.quantity))} className="h-10 rounded-xl bg-brandTint px-3 text-sm font-semibold text-brandStrong">设置数量</button>
              <button type="button" aria-label="库存加一" disabled={saving} onClick={() => void adjustQuantity(1)} className="h-10 rounded-xl bg-brandStrong px-4 text-sm font-semibold text-white">+ 1</button>
            </div>
          </div>
          {stockQuantity !== null ? <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">库存数量<input type="number" min="0" step="1" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} className="ui-field h-10 w-28 rounded-xl border border-border px-3" /></label>
            <button type="button" onClick={() => void saveStockQuantity()} className="h-10 rounded-xl bg-brandStrong px-4 text-sm font-semibold text-white">保存数量</button>
            <button type="button" onClick={() => setStockQuantity(null)} className="h-10 px-3 text-sm">取消</button>
          </div> : null}
        </Section>
      ) : null}
      <Section title="借还记录" icon={<Handshake size={16} />}>
        {activeLoan ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 p-3">
            <div><p className="font-semibold text-amber-950">借给 {activeLoan.borrower_name}</p><p className="mt-1 text-xs text-amber-800">{activeLoan.due_at ? `预计 ${new Date(activeLoan.due_at).toLocaleDateString('zh-CN')} 归还` : '未设置归还日期'}</p></div>
            <button type="button" disabled={saving} onClick={() => void runMutation(() => lifecycleApi.returnLoan(activeLoan.id), { successTitle: '物品已归还', refreshItem: true })} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-900 px-3 text-xs font-semibold text-white"><RotateCcw size={14} />确认归还</button>
          </div>
        ) : (
          <div className="grid gap-2 xl:grid-cols-[1fr_1fr_auto]">
            <label><span className="sr-only">借用人</span><input value={borrowerName} onChange={(event) => setBorrowerName(event.target.value)} placeholder="家庭成员或外部联系人" className="ui-field h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>
            <ModernDatePicker value={dueAt} onChange={setDueAt} placeholder="选择预计归还日期" ariaLabel="预计归还日期" />
            <button type="button" disabled={saving || !borrowerName.trim()} onClick={() => void runMutation(() => lifecycleApi.createLoan({ itemId: item.id, borrowerName: borrowerName.trim(), dueAt: inventoryDateToIso(dueAt) }), { successTitle: '借出记录已保存', onSaved: () => { setBorrowerName(''); setDueAt(''); }, refreshItem: true })} className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50">登记借出</button>
          </div>
        )}
        {loans.length > 0 ? <p className="mt-3 text-xs text-slate-500">历史借还 {loans.length} 次</p> : null}
      </Section>

      <Section title="收据、说明书与保修凭证" icon={<FileText size={16} />}>
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-brandTint px-3 text-sm font-semibold text-brandStrong">
          <Upload size={16} />上传凭证
          <input
            type="file"
            accept=".pdf,.txt,.doc,.docx,image/*"
            className="sr-only"
            disabled={saving}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              void runMutation(async () => {
                const uploaded = await lifecycleApi.uploadAttachment(file);
                await lifecycleApi.createAttachment(item.id, {
                  kind: 'other',
                  name: uploaded.name || file.name,
                  fileUrl: uploaded.url,
                  mimeType: uploaded.mimeType || file.type,
                  sizeBytes: file.size,
                });
              }, { successTitle: '凭证已上传' });
            }}
          />
        </label>
        {attachments.length > 0 ? (
          <ul className="mt-3 space-y-2">{attachments.map((attachment) => <li key={attachment.id}><a href={attachment.file_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brandStrong hover:underline">{attachment.name}</a></li>)}</ul>
        ) : <p className="mt-3 text-sm text-slate-500">可保存 PDF、图片、文本或 Word 文档。</p>}
      </Section>

      <Section title="维护记录" icon={<Wrench size={16} />}>
        <div className="grid gap-2 xl:grid-cols-[1fr_1fr_auto]">
          <input value={maintenanceTitle} onChange={(event) => setMaintenanceTitle(event.target.value)} placeholder="例如：更换滤芯" aria-label="维护事项" className="ui-field h-10 rounded-xl border border-border bg-surface px-3 text-sm" />
          <ModernDatePicker value={nextDueAt} onChange={setNextDueAt} placeholder="选择下次维护日期" ariaLabel="下次维护日期" />
          <button type="button" disabled={saving || !maintenanceTitle.trim()} onClick={() => void runMutation(() => lifecycleApi.createMaintenance(item.id, { title: maintenanceTitle.trim(), performedAt: new Date().toISOString(), nextDueAt: inventoryDateToIso(nextDueAt) }), { successTitle: '维护记录已保存', onSaved: () => { setMaintenanceTitle(''); setNextDueAt(''); } })} className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50">添加</button>
        </div>
        {maintenance.length > 0 ? <ul className="mt-3 space-y-2">{maintenance.map((record) => <li key={record.id} className="text-sm text-slate-600"><span className="font-semibold text-slate-800">{record.title}</span>{record.next_due_at ? ` · 下次 ${new Date(record.next_due_at).toLocaleDateString('zh-CN')}` : ''}</li>)}</ul> : null}
      </Section>

      <Section title="消耗品批次" icon={<PackagePlus size={16} />}>
        <div className="grid gap-2 xl:grid-cols-[8rem_1fr_auto]">
          <input type="number" min={1} value={batchQuantity} onChange={(event) => setBatchQuantity(Number(event.target.value))} aria-label="批次数量" className="ui-field h-10 rounded-xl border border-border bg-surface px-3 text-sm" />
          <ModernDatePicker value={batchExpiry} onChange={setBatchExpiry} placeholder="选择有效期" ariaLabel="批次有效期" />
          <button type="button" disabled={saving || batchQuantity < 1} onClick={() => void runMutation(() => lifecycleApi.createBatch(item.id, { quantity: batchQuantity, expiryDate: batchExpiry || null }), { successTitle: '消耗品批次已添加', onSaved: () => { setBatchQuantity(1); setBatchExpiry(''); }, refreshItem: true })} className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50">入库</button>
        </div>
        {batches.length > 0 ? <p className="mt-3 text-sm text-slate-600">共 {batches.reduce((sum, batch) => sum + batch.quantity, 0)} 件 · {batches.length} 个批次</p> : <p className="mt-3 text-sm text-slate-500">添加批次后会自动切换为消耗品追踪并汇总数量。</p>}
      </Section>
    </fieldset>
    </>
  );
}
