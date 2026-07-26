import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, Clock3, ShieldCheck, Wrench } from 'lucide-react';
import type { Reminder } from '@inplace/domain';
import { useToast } from '../../../shared/ui/toast';
import { PageContent, PageHeader, PageShell } from '../../../shared/ui/PageLayout';
import { lifecycleApi } from '../api';

const TYPE_ICONS = {
  warranty: ShieldCheck,
  loan: Clock3,
  maintenance: Wrench,
  stocktake: Bell,
};

export default function RemindersPage() {
  const { notify } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setReminders(await lifecycleApi.listReminders());
    } catch (error) {
      notify({ tone: 'error', title: '提醒加载失败', description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = async (reminder: Reminder) => {
    try {
      await lifecycleApi.updateReminderStatus(reminder.id, 'read');
      setReminders((current) => current.map((entry) => entry.id === reminder.id ? { ...entry, status: 'read' } : entry));
    } catch (error) {
      notify({ tone: 'error', title: '提醒状态保存失败', description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <PageShell>
      <PageHeader width="narrow" eyebrow="长期维护" title="提醒中心" titleSize="detail" />
      <PageContent width="narrow">
        {loading ? <p className="text-sm text-slate-500">正在生成家庭提醒…</p> : null}
        {!loading && reminders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surfaceMuted p-10 text-center">
            <Bell size={34} className="mx-auto text-brand" />
            <p className="mt-3 font-bold text-slate-800">当前没有提醒</p>
            <p className="mt-1 text-sm text-slate-500">保修、借用、维护和久未盘点事项会集中出现在这里。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const Icon = TYPE_ICONS[reminder.type];
              const overdue = new Date(reminder.due_at).getTime() < Date.now();
              return (
                <article key={reminder.id} className={`flex flex-wrap items-start gap-3 rounded-3xl border bg-surface p-4 shadow-sm ${reminder.status === 'unread' ? 'border-brand/30' : 'border-borderSoft opacity-75'}`}>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${overdue ? 'bg-rose-50 text-rose-700' : 'bg-brandTint text-brandStrong'}`}><Icon size={20} /></span>
                  <div className="min-w-[14rem] flex-1">
                    <p className="font-bold text-slate-900">{reminder.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{reminder.description}</p>
                    <p className={`mt-2 text-xs font-semibold ${overdue ? 'text-rose-700' : 'text-slate-500'}`}>{overdue ? '已到期 · ' : '到期 · '}{new Date(reminder.due_at).toLocaleString('zh-CN')}</p>
                  </div>
                  {reminder.status === 'unread' ? <button type="button" onClick={() => void markRead(reminder)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-surfaceMuted px-3 text-xs font-bold text-slate-700"><Check size={15} />标为已读</button> : null}
                </article>
              );
            })}
          </div>
        )}
      </PageContent>
    </PageShell>
  );
}
