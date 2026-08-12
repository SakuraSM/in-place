import { useState, type ReactElement } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { itemsApi, lifecycleApi } from '@/shared/api/mobileClient';
import { useHousehold } from '@/providers/HouseholdProvider';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { ContentTabs } from '@/shared/ui/ContentTabs';
import { FormField } from '@/shared/ui/FormField';
import { SectionCard } from '@/shared/ui/SectionCard';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';

type LifecycleTab = 'stock' | 'loan' | 'maintenance' | 'batch';
type LifecycleForm = Exclude<LifecycleTab, 'stock'> | null;

const TABS = [
  { value: 'stock' as const, label: '库存' },
  { value: 'loan' as const, label: '借用' },
  { value: 'maintenance' as const, label: '维护' },
  { value: 'batch' as const, label: '批次' },
];

export function MobileLifecycleCard({ item, canEdit = true }: { item: Item; canEdit?: boolean }) {
  const { currentHouseholdId } = useHousehold();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<LifecycleTab>('stock');
  const [form, setForm] = useState<LifecycleForm>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [quantity, setQuantity] = useState('1');

  const loansQuery = useQuery({
    queryKey: ['mobile', 'loans', currentHouseholdId, item.id],
    queryFn: async () => (await lifecycleApi.listLoans()).filter((loan) => loan.item_id === item.id),
  });
  const maintenanceQuery = useQuery({
    queryKey: ['mobile', 'maintenance', currentHouseholdId, item.id],
    queryFn: () => lifecycleApi.listMaintenance(item.id),
  });
  const batchesQuery = useQuery({
    queryKey: ['mobile', 'batches', currentHouseholdId, item.id],
    queryFn: () => lifecycleApi.listBatches(item.id),
  });

  const refreshLifecycle = () => queryClient.invalidateQueries({ queryKey: ['mobile'] });
  const stockMutation = useMutation({
    mutationFn: (nextQuantity: number) => itemsApi.updateItem(item.id, { quantity: Math.max(0, nextQuantity) }),
    onSuccess: async () => {
      await refreshLifecycle();
      notify({ tone: 'success', title: '库存数量已更新' });
    },
    onError: (error) => notify({ tone: 'error', title: '库存更新失败', description: getErrorMessage(error) }),
  });
  const createMutation = useMutation({
    mutationFn: async () => {
      if (form === 'loan') {
        if (!name.trim()) throw new Error('请输入借用人');
        await lifecycleApi.createLoan({ itemId: item.id, borrowerName: name.trim(), dueAt: date || null, notes });
      } else if (form === 'maintenance') {
        if (!name.trim()) throw new Error('请输入维护项目');
        await lifecycleApi.createMaintenance(item.id, {
          title: name.trim(),
          notes,
          performedAt: date || new Date().toISOString().slice(0, 10),
        });
      } else if (form === 'batch') {
        const parsedQuantity = Number(quantity);
        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) throw new Error('批次数量至少为 1');
        await lifecycleApi.createBatch(item.id, { quantity: parsedQuantity, expiryDate: date || null, notes });
      }
    },
    onSuccess: async () => {
      const completedForm = form;
      setForm(null);
      setName('');
      setNotes('');
      setDate('');
      setQuantity('1');
      await refreshLifecycle();
      notify({ tone: 'success', title: completedForm === 'loan' ? '借出记录已创建' : completedForm === 'maintenance' ? '维护记录已添加' : '批次已入库' });
    },
    onError: (error) => notify({ tone: 'error', title: '保存失败，输入已保留', description: getErrorMessage(error) }),
  });
  const returnMutation = useMutation({
    mutationFn: (loanId: string) => lifecycleApi.returnLoan(loanId),
    onSuccess: async () => {
      await refreshLifecycle();
      notify({ tone: 'success', title: '物品已归还' });
    },
    onError: (error) => notify({ tone: 'error', title: '归还失败', description: getErrorMessage(error) }),
  });

  return (
    <>
      <SectionCard title="库存与生命周期" subtitle="数量、借用、维护和消耗批次" density="compact">
        <ContentTabs accessibilityLabel="生命周期内容" tabs={TABS} value={tab} onChange={setTab} />
        {tab === 'stock' ? (
          <View style={stockPanelStyle}>
            <View>
              <Text style={stockValueStyle}>{item.quantity}</Text>
              <Text style={metaTextStyle}>{item.tracking_mode === 'consumable' ? '消耗品库存' : '当前库存'}</Text>
            </View>
            {canEdit ? <View style={quantityActionsStyle}>
              <QuantityButton label="减少库存" icon="remove" onPress={() => stockMutation.mutate(item.quantity - 1)} />
              <QuantityButton label="增加库存" icon="add" onPress={() => stockMutation.mutate(item.quantity + 1)} />
            </View> : null}
          </View>
        ) : null}
        {tab === 'loan' ? (
          <LifecycleList empty="暂无借用记录" actionLabel={canEdit ? '新增借出' : undefined} onAction={() => setForm('loan')}>
            {(loansQuery.data ?? []).map((loan) => (
              <CompactListRow
                key={loan.id}
                title={loan.borrower_name}
                subtitle={loan.due_at ? `应还 ${new Date(loan.due_at).toLocaleDateString('zh-CN')}` : '未设置归还日期'}
                meta={loan.returned_at ? '已归还' : '归还'}
                iconName="return-down-back-outline"
                onPress={canEdit && !loan.returned_at ? () => returnMutation.mutate(loan.id) : undefined}
              />
            ))}
          </LifecycleList>
        ) : null}
        {tab === 'maintenance' ? (
          <LifecycleList empty="暂无维护记录" actionLabel={canEdit ? '记录维护' : undefined} onAction={() => setForm('maintenance')}>
            {(maintenanceQuery.data ?? []).map((record) => (
              <CompactListRow key={record.id} title={record.title} subtitle={record.notes || new Date(record.performed_at).toLocaleDateString('zh-CN')} meta={record.cost === null ? undefined : `¥${record.cost.toFixed(2)}`} iconName="construct-outline" />
            ))}
          </LifecycleList>
        ) : null}
        {tab === 'batch' ? (
          <LifecycleList empty="暂无消耗批次" actionLabel={canEdit ? '新增批次' : undefined} onAction={() => setForm('batch')}>
            {(batchesQuery.data ?? []).map((batch) => (
              <CompactListRow key={batch.id} title={`${batch.quantity} 件`} subtitle={batch.notes || '消耗品批次'} meta={batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString('zh-CN') : '无到期日'} iconName="layers-outline" />
            ))}
          </LifecycleList>
        ) : null}
      </SectionCard>

      <BottomSheet visible={Boolean(form)} title={getFormTitle(form)} onClose={() => setForm(null)}>
        {form === 'loan' ? <FormField label="借用人" value={name} onChangeText={setName} placeholder="姓名" /> : null}
        {form === 'maintenance' ? <FormField label="维护项目" value={name} onChangeText={setName} placeholder="例如：更换滤芯" /> : null}
        {form === 'batch' ? <FormField label="批次数量" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" /> : null}
        <FormField label={form === 'maintenance' ? '维护日期' : form === 'batch' ? '到期日期（可选）' : '应还日期（可选）'} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <FormField label="备注（可选）" value={notes} onChangeText={setNotes} placeholder="补充说明" multiline />
        <Pressable disabled={createMutation.isPending} onPress={() => createMutation.mutate()} style={primaryButtonStyle}>
          <Text style={primaryButtonTextStyle}>{createMutation.isPending ? '保存中…' : '保存'}</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
}

function getFormTitle(form: LifecycleForm) {
  if (form === 'loan') return '新增借出';
  if (form === 'maintenance') return '记录维护';
  return '新增消耗批次';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '请稍后重试';
}

function QuantityButton({ label, icon, onPress }: { label: string; icon: 'add' | 'remove'; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={quantityButtonStyle}>
      <Ionicons name={icon} size={20} color={palette.brandStrong} />
    </Pressable>
  );
}

function LifecycleList({ empty, actionLabel, onAction, children }: { empty: string; actionLabel?: string; onAction: () => void; children: ReactElement | ReactElement[] }) {
  const rows = Array.isArray(children) ? children : children ? [children] : [];
  return (
    <View style={{ gap: 8 }}>
      {actionLabel ? <Pressable onPress={onAction} style={addButtonStyle}><Text style={addButtonTextStyle}>{actionLabel}</Text></Pressable> : null}
      {rows.length === 0 ? <Text style={metaTextStyle}>{empty}</Text> : children as never}
    </View>
  );
}

const stockPanelStyle = { minHeight: 78, borderRadius: 16, backgroundColor: palette.surfaceMuted, padding: 14, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 12 };
const stockValueStyle = { fontSize: 28, fontWeight: '900' as const, color: palette.text };
const metaTextStyle = { fontSize: 13, lineHeight: 18, color: palette.textSoft };
const quantityActionsStyle = { flexDirection: 'row' as const, gap: 8 };
const quantityButtonStyle = { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.brandTint, alignItems: 'center' as const, justifyContent: 'center' as const };
const addButtonStyle = { minHeight: 42, borderRadius: 14, backgroundColor: palette.brandTint, alignItems: 'center' as const, justifyContent: 'center' as const };
const addButtonTextStyle = { fontSize: 13, fontWeight: '900' as const, color: palette.brandStrong };
const primaryButtonStyle = { minHeight: 46, borderRadius: 15, backgroundColor: palette.brandStrong, alignItems: 'center' as const, justifyContent: 'center' as const };
const primaryButtonTextStyle = { fontSize: 14, fontWeight: '900' as const, color: '#ffffff' };
